import {createElement, render} from "./react";

const element = createElement('h1', {style: 'color: red'},
    createElement('h2', null, 'hello'),
    createElement('h2', null, 'hello'))

console.info("🚀 ~ console -----:>>", element)

function App(props) {
    return createElement('div', {class: 'div-cls'}, 'div')
}

const container = document.getElementById('root')

render(element, container)

