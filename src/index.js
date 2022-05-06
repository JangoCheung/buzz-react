import Buzz from './framework';

const { useState } = Buzz;

const Message = () => {
  const [message, setMessage] = useState("Hello");

  return (
    <h1
      onClick={(e) => {
        setMessage((message) => message + message);
      }}
    >
      Click Me! {message}
    </h1>
  );
};

const App = () => {
  const [count, setCount] = useState(0);
  const [num, setNum] = useState(100);

  /** @jsx Buzz.createElement */
  return (
    <div>
      <h1>Hello zeact</h1>
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
      {/* <Message /> */}
    </div>
  );
};

Buzz.render(
  <div>
    <App />
  </div>,
  document.getElementById("root")
);