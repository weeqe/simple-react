function createDom(fiber) {
    const dom = fiber.type === 'TEXT_ELEMENT' ? document.createTextNode('') : document.createElement(fiber.type)
    updateDom(dom, {}, fiber.props)
    return dom
}

let nextUnitOfWork = null
let wipRoot = null
let currentRoot = null // commitRoot 提交完成后保存当前fiber树的引用
let deletions = null

export function render(element, container) {
    wipRoot = {
        dom: container,
        props: {
            children: [element]
        },
        alternate: currentRoot // 指向旧的 fiber 树，即上一次提交到 DOM 的fiber
    }
    deletions = []
    nextUnitOfWork = wipRoot
}


function workLoop(deadline) {
    let shouldYield = false

    while (nextUnitOfWork && !shouldYield) {
        nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
        shouldYield = deadline.timeRemaining() < 1
    }

    // 完成了所有的工作后 提交
    if (!nextUnitOfWork && wipRoot) {
        commitRoot()
    }

    requestIdleCallback(workLoop)
}

requestIdleCallback(workLoop)

/**
 * 将元素添加到dom
 * 为子元素创建fibers
 * 选择下一个工作单元
 */
function performUnitOfWork(fiber) {
    if (!fiber.dom) {
        fiber.dom = createDom(fiber)
    }
    // 为每个子元素创建fiber
    const elements = fiber.props.children

    reconcilenChildren(fiber, elements)

    if (fiber.child) {
        return fiber.child
    }
    let nextFiber = fiber

    while (nextFiber) {
        if (nextFiber.sibling) {
            return nextFiber.sibling
        }
        nextFiber = nextFiber.parent
    }
}

function commitRoot() {
    deletions.forEach(commitWork)
    commitWork(wipRoot.child)
    currentRoot = wipRoot
    wipRoot = null
}

function commitWork(fiber) {
    if (!fiber) {
        return
    }
    const domParent = fiber.parent.dom
    if (fiber.effectTag === 'PLACEMENT' && fiber.dom !== null) {
        domParent.appendChild(fiber.dom)
    } else if (fiber.effectTag === 'UPDATE' && fiber.dom !== null) {
        updateDom(fiber.dom, fiber.alternate.props, fiber.props)
    } else if (fiber.effectTag === 'DELETION') {
        domParent.removeChild(fiber.dom)
    }

    domParent.appendChild(fiber.dom)
    commitWork(fiber.child)
    commitWork(fiber.sibling)
}

// 协调旧fiber 和 新元素
function reconcilenChildren(wipFiber, elements) {
    let index = 0
    //  上次渲染的东西
    let oldFiber = wipFiber.alternate && wipFiber.alternate.child

    let prevSibling = null

    while (index < elements.length || oldFiber !== null) {
        // 想要渲染到 DOM 的东西
        const element = elements[index]
        let newFiber = null

        // 比较 oldFiber 和 element 看是否需要对DOM 进行修改

        const sameType = oldFiber && element && oldFiber.type === element.type

        if (sameType) {
            // 更新node
            newFiber = {
                type: oldFiber.type,
                props: element.props,
                dom: oldFiber.dom,
                parent: wipFiber,
                alternate: oldFiber,
                effectTag: 'UPDATE'
            }
        }
        if (element && !sameType) {
            // 添加新节点
            newFiber = {
                type: element.type,
                props: element.props,
                dom: null,
                parent: wipFiber,
                alternate: null,
                effectTag: 'PLACEMENT'
            }
        }
        if (oldFiber && !sameType) {
            // 删除oldFiber的 node
            oldFiber.effectTag = 'DELETION'
            deletions.push(oldFiber)
        }
        if (oldFiber) {
            oldFiber = oldFiber.sibling
        }
        if (index === 0) {
            wipFiber.child = newFiber
        } else if (element) {
            prevSibling.sibling = newFiber
        }
        prevSibling = newFiber
        index++
    }
}

const isProperty = key => key !== 'children'
const isNew = (prev, next) => key => prev[key] !== next[key]
const isGone = (prev, next) => key => !(key in next)
const isEvent = key => key.startsWith('on')

function updateDom(dom, prevProps, nextProps) {
    console.info("🚀 ~ dom -----:>>", dom, prevProps, nextProps)

    // 删除旧的props
    Object.keys(prevProps)
        .filter(isProperty)
        .filter(isGone(prevProps, nextProps))
        .forEach(name => {
            dom[name] = ''
        })
    // 删除旧的事件
    Object.keys(prevProps)
        .filter(isEvent)
        .filter(key => {
            return  !(key in nextProps) || isNew(prevProps, nextProps)(key)
        })
        .forEach(name => {
            const eventType = name.toLowerCase().substring(2)
            dom.removeEventListener(eventType, prevProps[name])
        })
    // 设置新的props
    Object.keys(nextProps)
        .filter(isProperty)
        .filter(isNew(prevProps, nextProps))
        .forEach(name => {
            dom[name] = nextProps[name]
        })
    // 添加新的事件
    Object.keys(nextProps)
        .filter(isEvent)
        .filter(isNew(prevProps, nextProps))
        .forEach(name => {
            const eventType = name.toLowerCase().substring(2)
            dom.addEventListener(eventType, nextProps[name])
        })
}