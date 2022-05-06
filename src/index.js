import Buzz from './framework';

const { useState, useRef } = Buzz;

const Message = () => {
  const [message, setMessage] = useState("Hello");

  return (
    <div>
      <h3>Child Component</h3>
      <p>{message}</p>
      <button onClick={(e) => setMessage(message + '!')}>Click</button>
    </div>
  );
};

const App = () => {
  const [count, setCount] = useState(0);
  const [num, setNum] = useState(100);
  const ref = useRef(null);

  /** @jsx Buzz.createElement */
  return (
    <div>
      <h1 ref={ref} onClick={() => {
        console.log(ref);
      }}>Hello zeact</h1>
      <hr/>
      <h2>Count: {count}</h2>
      <button onClick={() => setCount(count + 1)}>Add</button>
      <button onClick={() => setCount(count - 1)}>Sub</button>
      <hr/>
      <h2>Num: {num}</h2>
      <button onClick={() => {
        setNum(num + 1);
        setNum(num + 2);
      }}>Add</button>
      <button onClick={() => setNum(num - 1)}>Sub</button>
      <hr />
      <Message />
    </div>
  );
};

Buzz.render(
  <div>
    <App />
  </div>,
  document.getElementById("root")
);