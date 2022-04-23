const { updateDom, createElement } = require('./dom');

const commitRoot = () => {
  commitWork(wipRoot.child);
  currentRoot = wipRoot;
  wipRoot = null;
}

const commitWork = (fiber) => {
  if (!fiber) {
    return
  }

  const domParent = fiber.parent.dom;
  const isFunctionComponent = fiber.type instanceof Function;
  const dom = isFunctionComponent ? fiber.child.dom : fiber.dom
  const child = isFunctionComponent ? fiber.child.child : fiber.child;
  const sibling = isFunctionComponent ? fiber.child.sibling : fiber.sibling;

  if (fiber.effectTag === 'PLACEMENT') {
    domParent.appendChild(dom);
  } else if (fiber.effectTag === 'UPDATE') {
    updateDom(dom, fiber.alternate.props, fiber.props);
  }

  commitWork(child);
  commitWork(sibling);
}

const createDOM = (fiber) => {
  const dom = fiber.type == "TEXT_ELEMENT" ? document.createTextNode("") : document.createElement(fiber.type);

  updateDom(dom, {}, fiber.props);

  return dom
};

let nextUnitOfWork = null;
let wipRoot = null;
let currentRoot = null;

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
  let prevAlternate = fiber?.alternate?.child;;
  
  for (let index = 0; index < vdoms.length; index++) {
    let childVDOM = vdoms[index];
    let childFiber = null;
    let sameType = childVDOM?.type === prevAlternate?.type;

    // 相同节点，就更新节点属性
    if (sameType) {
      childFiber = {
        type: childVDOM.type,
        props: childVDOM.props,
        dom: prevAlternate.dom,
        parent: fiber,
        alternate: prevAlternate,
        effectTag: "UPDATE"
      }
    }

    if (element && !sameType) {
      childFiber = {
        type: childVDOM.type,
        props: childVDOM.props,
        dom: null,
        parent: fiber,
        alternate: null,
        effectTag: "PLACEMENT"
      }
    }

    if (index === 0) {
      fiber.child = childFiber;
    } else {
      prevSibling.sibling = childFiber;
      prevAlternate = prevAlternate?.sibling || null;
    }

    prevSibling = childFiber;
  }
}

const updateHostComponent = (fiber) => {
  if (!fiber.dom) {
    fiber.dom = createDOM(fiber);
  }

  reconcileChildren(fiber, fiber.props.children);
}

const updateFunctionComponent = (fiber) => {
  fiber.hooks = [];
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

  while(prevSibling) {
    if (prevSibling.sibling) {
      return prevSibling.sibling;
    }

    prevSibling = prevSibling.parent
  }
};

const render = (vdom, container) => {
  wipRoot = {
    dom: container,
    props: {
      children: [vdom]
    },
    alternate: currentRoot
  };
  nextUnitOfWork = wipRoot;
  // const dom = createDOM(vdom);

  // container.appendChild(dom);
};

const useState = (initialState) => {

};

const Didact = {
  createElement,
  render,
  useState
};

/** @jsx Didact.createElement */
function Counter() {
  const [state, setState] = Didact.useState(1);
  return (
    <h1 onClick={() => setState(c => c + 1)} style="user-select: none">
      Count: {state}
    </h1>
  );
}
const element = <Counter />;

const Message = () => {
  return <h1 onClick={e => console.log('Message')}>Hello Message</h1>
};

const App = () => {
  return (
    <div>
      <h1>Hello zeact</h1>
      <h2>Hello</h2>
      <Message />
    </div>
  )
};

const container = document.getElementById("root");
Didact.render(<App />, container);
