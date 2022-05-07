const { updateDom, createElement } = require("./dom");

let nextUnitOfWork = null;
let wipRoot = null;
let currentRoot = null;
let hookIndex = null;
// WorkingInProgress 记录当前 progree fiber
let wipFiber = null;
let deletions = [];

const commitRoot = () => {
  // 删除旧节点
  deletions.forEach(commitWork);
  commitWork(wipRoot.child);
  currentRoot = wipRoot;
  wipRoot = null;
};

const commitWork = (fiber) => {
  if (!fiber) {
    return;
  }

  const domParent = fiber.parent.dom;
  const isFunctionComponent = fiber.type instanceof Function;
  const dom = isFunctionComponent ? fiber.child.dom : fiber.dom;
  const child = isFunctionComponent ? fiber.child.child : fiber.child;
  const sibling = isFunctionComponent ? fiber.child.sibling : fiber.sibling;

  if (fiber.effectTag === "PLACEMENT") {
    if (dom != null) {
      domParent.appendChild(dom);
    }
    runEffects(fiber);
  } else if (fiber.effectTag === "UPDATE") {
    cancelEffects(fiber);
    if (fiber.dom !== null) {
      updateDom(dom, fiber.alternate.props, fiber.props);
    }
    runEffects(fiber);
  } else if (fiber.effectTag === "DELETION") {
    cancelEffects(fiber);
    commitDeletion(fiber, domParent);
    return;
  }

  commitWork(child);
  commitWork(sibling);
};

function commitDeletion(fiber, domParent) {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom);
  } else {
    commitDeletion(fiber.child, domParent);
  }
}

const createDOM = (fiber) => {
  const dom =
    fiber.type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(fiber.type);

  updateDom(dom, {}, fiber.props);

  return dom;
};

function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }

  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }

  requestIdleCallback(workLoop);
}

requestIdleCallback(workLoop);

/**
 * reconcileChildren vdom -> fiber
 */
const reconcileChildren = (fiber, vdoms) => {
  let prevSibling = null;
  // 获取到上一次 fiber 里的 child 值
  let oldFiber = fiber?.alternate?.child;
  let index = 0;

  while (index < vdoms.length || oldFiber != null) {
    let childVDOM = vdoms[index];
    let newFiber = null;
    let sameType = childVDOM && oldFiber && childVDOM?.type === oldFiber?.type;

    // 相同节点，就更新节点属性
    if (sameType) {
      newFiber = {
        type: childVDOM.type,
        props: childVDOM.props,
        dom: oldFiber.dom,
        parent: fiber,
        alternate: oldFiber,
        effectTag: "UPDATE",
      };
    }

    if (childVDOM && !sameType) {
      newFiber = {
        type: childVDOM.type,
        props: childVDOM.props,
        dom: null,
        parent: fiber,
        alternate: null,
        effectTag: "PLACEMENT",
      };
    }

    // 存在之前的fiber，但是类型不同，需要删除旧节点
    if (oldFiber && !sameType) {
      oldFiber.effectTag = "DELETION";
      deletions.push(oldFiber);
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    if (index === 0) {
      fiber.child = newFiber;
    } else {
      prevSibling.sibling = newFiber;
    }

    prevSibling = newFiber;
    index++;
  }
};

const updateHostComponent = (fiber) => {
  if (!fiber.dom) {
    fiber.dom = createDOM(fiber);

    if (fiber?.props?.ref) {
      fiber.props.ref.current = fiber.dom;
    }
  }

  reconcileChildren(fiber, fiber.props.children);
};

/**
 * 更新组建树
 */
const updateFunctionComponent = (fiber) => {
  wipFiber = fiber;
  hookIndex = 0;
  wipFiber.hooks = [];
  // 执行 FC
  const children = [fiber.type(fiber.props)];
  reconcileChildren(fiber, children);
};

/**
 * 返回下一个要处理的 fiber
 * child -> sibling -> parent
 * @param {*} fiber
 */
const performUnitOfWork = (fiber) => {
  const isFunctionComponent = fiber.type instanceof Function;

  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }

  if (fiber.child) {
    return fiber.child;
  }

  let prevSibling = fiber;

  while (prevSibling) {
    if (prevSibling.sibling) {
      return prevSibling.sibling;
    }

    prevSibling = prevSibling.parent;
  }
};

const render = (vdom, container) => {
  wipRoot = {
    dom: container,
    props: {
      children: [vdom],
    },
    alternate: currentRoot,
  };
  deletions = [];
  nextUnitOfWork = wipRoot;
};

/**
 * 1. 为当前 hook 设置索引位置，新增or使用上一次 hook state
 * 2. 回调执行后更新 fiber 数，让 schdule 更新数
 * @param {any} initialState
 * @returns
 */
const useState = (initialState) => {
  const oldHook = wipFiber?.alternate?.hooks?.[hookIndex];
  const hook = {
    state: oldHook ? oldHook.state : initialState,
    queue: [],
  };

  const actions = oldHook ? oldHook.queue : [];
  actions.forEach((action) => {
    hook.state = typeof action === "function" ? action(hook.state) : action;
  });

  const setState = (action) => {
    hook.queue.push(action);
    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot,
    };
    nextUnitOfWork = wipRoot;
    deletions = [];
  };

  wipFiber.hooks.push(hook);
  hookIndex++;
  return [hook.state, setState];
};

const useRef = (initialValue) => {
  const oldHook = wipFiber?.alternate?.hooks?.[hookIndex];
  const ref = { current: initialValue };
  const hook = {
    state: oldHook?.state || ref,
  };

  wipFiber.hooks.push(hook);
  hookIndex++;
  return ref;
};

function cancelEffects(fiber) {
  if (fiber.hooks) {
    fiber.hooks
      .filter((hook) => hook.tag === "effect" && hook.cancel)
      .forEach((effectHook) => {
        effectHook.cancel();
      });
  }
}

function runEffects(fiber) {
  if (fiber.hooks) {
    fiber.hooks
      .filter((hook) => hook.tag === "effect" && hook.effect)
      .forEach((effectHook) => {
        effectHook.cancel = effectHook.effect();
      });
  }
}

const hasDepsChanged = (prevDeps, nextDeps) => {
  if (!prevDeps) return true;
  if (!nextDeps) return true;

  if (prevDeps.length !== nextDeps.length) return true;
  if (prevDeps.some((dep, index) => dep !== nextDeps[index])) return true;

  return false;
}

function useEffect(effect, deps) {
  const oldHook = wipFiber?.alternate?.hooks?.[hookIndex];
  const hasChanged = hasDepsChanged(oldHook?.deps ?? undefined, deps);
  const hook = {
    tag: "effect",
    effect: hasChanged ? effect : null,
    cancel: hasChanged && oldHook?.cancel,
    deps,
  };

  wipFiber.hooks.push(hook);
  hookIndex++;
}

export default {
  createElement,
  render,
  useState,
  useRef,
  useEffect,
};
