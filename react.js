const TEXT_ELEMENT = 'TEXT_ELEMENT';

function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map((item) =>
        typeof item === 'object' ? item : createTextNode(item)
      ),
    },
  };
}

function createTextNode(text) {
  return {
    type: TEXT_ELEMENT,
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

function createDom(fiber) {
  const dom =
    fiber.type === TEXT_ELEMENT
      ? document.createTextNode('')
      : document.createElement(fiber.type);
  const elements = fiber.props.children;
  // 添加props
  Object.keys(fiber.props)
    .filter(isProperty)
    .forEach((key) => {
      dom[key] = fiber.props[key];
    });
  updateDom(dom, {}, fiber.props);
  return dom;
}

function commitRoot() {
  deletions.forEach(commitWork);
  commitWork(wipRoot.child);
  currentRoot = wipRoot;
  wipRoot = null;
}

function commitWork(fiber) {
  if (!fiber) {
    return;
  }
  const domParent = fiber.parent.dom;
  if (fiber.effectTag === 'PLACEMENT' && fiber.dom !== null) {
    console.log(fiber.dom);
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === 'UPDATE' && fiber.dom !== null) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  } else if (fiber.effectTag === 'DELETION') {
    domParent.removeChild(fiber.dom);
  }
  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

const isProperty = (key) => key !== 'children' && !isEvent(key);
const isNew = (prev, next) => (key) => prev[key] !== next[key];
const isGone = (prev, next) => (key) => !(key in next);
const isEvent = (key) => key.startsWith('on');

function updateDom(dom, prevProps, nextProps) {
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach((name) => {
      dom[name] = '';
    });
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      dom[name] = nextProps[name];
    });
  Object.keys(prevProps)
    .filter(isEvent)
    .filter((key) => !(key in nextProps) || isNew(prevProps, nextProps)(key))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.removeEventListener(eventType, prevProps[name]);
    });
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.addEventListener(eventType, nextProps[name]);
    });
}

// 改成 fiber
function render(element, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    alternate: currentRoot,
  };
  deletions = [];
  nextUnitOfWork = wipRoot;
}

let nextUnitOfWork = null;
let wipRoot = null;
let currentRoot = null;
let deletions = null;

function workLoop(deadTime) {
  let shouldYield = false;
  if (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadTime.timeRemaining() < 1;

    if (!nextUnitOfWork && wipRoot) {
      commitRoot();
    }
  }
  requestIdleCallback(workLoop);
}

requestIdleCallback(workLoop);

// fiber树
/**
 * {
 * 	dom,
 *  props,
 *  parent,
 *  child,
 *  sibling
 * }
 * @param {*} fiber
 */
function performUnitOfWork(fiber) {
  // 拿到fiber后 遍历children 增加指针 child sibling 创建dom 完善fiber
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }
  // if (fiber.parent) {
  //   fiber.parent.dom.appendChild(fiber.dom);
  // }
  const elements = fiber.props.children;
  reconcileChildren(fiber, elements);

  if (fiber.child) {
    return fiber.child;
  }
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
}

//  reconcile the old fibers with the new elements
function reconcileChildren(wipFiber, elements) {
  // 遍历fiber的children 增加指针
  let index = 0;
  let pervSibling = null;
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
  while (index < elements.length) {
    const element = elements[index];
    let newFiber = null;

    const sameType = oldFiber && element && oldFiber.type === element.type;

    if (sameType) {
      // update
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        parent: wipFiber,
        dom: oldFiber.dom,
        alternate: oldFiber,
        effectTag: 'UPDATE',
      };
    }

    if (element && !sameType) {
      // add node
      newFiber = {
        type: element.type,
        props: element.props,
        parent: wipFiber,
        dom: null,
        alternate: null,
        effectTag: 'PLACEMENT',
      };
    }

    if (oldFiber && !sameType) {
      // delete oldFiber node
      oldFiber.effectTag = 'DELETION';
      deletions.push(oldFiber);
    }

    // 和wipFiber的指针要对应 遍历的时候是 parent => child => sibling
    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    if (index === 0) {
      wipFiber.child = newFiber;
    } else {
      pervSibling.sibling = newFiber;
    }
    pervSibling = newFiber;
    index++;
  }
}

const React = {
  createElement,
  render,
};

const container = document.getElementById('root');

function UpdateVal(e) {
  console.log('eee', e.target.value);
  rRender(e.target.value);
}

const rRender = (value) => {
  const element = React.createElement(
    'div',
    {
      id: 'div',
      style: 'background: red',
    },
    React.createElement('input', {
      value: value,
      onInput: UpdateVal,
    }),
    React.createElement('p', { class: 'hello' }, 'hello'),
    value
  );

  React.render(element, container);
};

rRender('world');
