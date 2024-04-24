import express from 'express'
import { Card, Accordion } from './components/index.js'
import { scripts } from './components/scripts.js'

const app = express()


app.get('/', (req, res) => {
    res.end(
        Card([
            Accordion({a: 123}),
            Accordion({a: 456}),
        ]) + `<script>${scripts}</script>`
    )
})

app.listen(3000, () => console.log(3000))