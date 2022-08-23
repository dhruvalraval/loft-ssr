import './reset.scss'
import './style.scss'

import "splitting/dist/splitting.css";
import "splitting/dist/splitting-cells.css";
import Splitting from "splitting";

import Canvas from './src/Canvas'

const split = Splitting()

window.addEventListener('load', _ => {
  console.log('%cDeveloped By TRIIIYE', 'color: black; background: orange; font-size: 15px')
  const canvas = new Canvas()
})