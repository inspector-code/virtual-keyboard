import * as storage from './storage.js'
import create from './utils/create.js'
import language from './layouts/index.js'
import Key from './Key.js'

const main = create('div', 'keyboard__container',
    [create('h1', 'title', 'Virtual keyboard')])
const closeButton = create('button', 'hide-keyboard-button material-icons', 'keyboard_hide')
const soundContainer = create('div', 'sound-container', [
    create('audio', null, null, null, ['src', './assets/sounds/key-press-ru.mp3']),
    create('audio', null, null, null, ['src', './assets/sounds/key-backspace-ru.mp3']),
    create('audio', null, null, null, ['src', './assets/sounds/key-caps-ru.mp3']),
    create('audio', null, null, null, ['src', './assets/sounds/key-enter-ru.mp3']),
    create('audio', null, null, null, ['src', './assets/sounds/key-shift-ru.mp3']),

    create('audio', null, null, null, ['src', './assets/sounds/key-press-en.mp3']),
    create('audio', null, null, null, ['src', './assets/sounds/key-backspace-en.wav']),
    create('audio', null, null, null, ['src', './assets/sounds/key-caps-en.mp3']),
    create('audio', null, null, null, ['src', './assets/sounds/key-enter-en.wav']),
    create('audio', null, null, null, ['src', './assets/sounds/key-shift-en.mp3'])
])

export default class Keyboard {
    constructor(rowsOrder) {
        window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        this.recognition = new SpeechRecognition()
        this.recognition.interimResults = true
        this.speechIsOn = false
        this.rowsOrder = rowsOrder
        this.isCaps = false
    }

    init(langCode) {
        this.keyBase = language[langCode]
        this.output = create('textarea', 'output', null, main,
            ['placeholder', 'Start type...'],
            ['rows', 5],
            ['spellcheck', false],
            ['autocorrect', 'off'])
        this.container = create('div', 'keyboard', null, main, ['language', langCode])
        closeButton.addEventListener('click', this.closeKeyboard)
        document.body.prepend(main, closeButton, soundContainer)
        return this
    }

    closeKeyboard = () => {
        this.container.classList.toggle('hide-keyboard')
        closeButton.classList.toggle('hide-keyboard-button-rotate')
    }

    activateSounds = () => {
        const soundButton = this.keyButtons.find(i => i.code === 'SoundButton').div.children[1]
        storage.set('sounds', !storage.get('sounds', true))
        if (storage.get('sounds')) {
            soundButton.innerHTML = '<div class="material-icons">volume_up</div>'
        } else {
            soundButton.innerHTML = '<div class="material-icons">volume_off</div>'
        }
    }

    generateLayout() {
        this.keyButtons = []
        this.rowsOrder.forEach((row, i) => {
            const rowElement = create('div', 'keyboard__row', null, this.container, ['row', i + 1])
            if (row.length === 12) {
                rowElement.style.gridTemplateColumns = `2.1fr repeat(10, 1fr) 2.1fr`
            } else if (row.length === 9) {
                rowElement.style.gridTemplateColumns = `repeat(2, 1fr) 6.5fr repeat(6, 1fr)`
            } else {
                rowElement.style.gridTemplateColumns = `repeat(${row.length}, 1fr)`
            }

            row.forEach(code => {
                const keyObj = this.keyBase.find(key => key.code === code)
                if (keyObj) {
                    if (keyObj.code === 'SoundButton') {
                        if (storage.get('sounds', true)) {
                            keyObj.small = '<div class="material-icons">volume_up</div>'
                        } else {
                            keyObj.small = '<div class="material-icons">volume_off</div>'
                        }
                    }
                    const keyButton = new Key(keyObj)
                    this.keyButtons.push(keyButton)
                    rowElement.append(keyButton.div)
                }
            })
        })

        document.addEventListener('keydown', this.handleEvent)
        document.addEventListener('keyup', this.handleEvent)
        this.container.onmousedown = this.preHandleEvent
        this.container.onmouseup = this.preHandleEvent
    }

    preHandleEvent = (e) => {
        e.stopPropagation()
        const keyDiv = e.target.closest('.keyboard__key')
        if (!keyDiv) return;
        const {dataset: {code}} = keyDiv
        if (code !== 'CapsLock' && code !== 'Speech' && code !== 'ShiftLeft' && code !== 'ShiftRight') {
            keyDiv.addEventListener('mouseleave', this.resetButtonState)
        }
        this.handleEvent({code, type: e.type})
    }

    resetButtonState = ({target: {dataset: {code}}}) => {
        const keyObj = this.keyButtons.find(key => key.code === code)
        keyObj.div.classList.remove('active')
        keyObj.div.removeEventListener('mouseleave', this.resetButtonState)
    }

    handleEvent = (e) => {
        if (e.stopPropagation) e.stopPropagation()
        const {code, type} = e
        const keyObj = this.keyButtons.find(key => key.code === code)
        if (!keyObj) return;
        this.output.focus()

        if (type.match(/keydown|mousedown/)) {
            if (type.match(/key/)) e.preventDefault()

            keyObj.div.classList.add('active')

            if (code.match(/Caps/) && !this.isCaps) {
                this.isCaps = true
                this.switchUpperCase(true)
            } else if (code.match(/Caps/) && this.isCaps) {
                this.isCaps = false
                this.switchUpperCase(false)
                keyObj.div.classList.remove('active')
            }

            //Shift
            if (code.match(/Shift/) && !this.shiftKey) {
                this.shiftKey = true
                this.switchUpperCase(true)
            } else if (code.match(/Shift/) && this.shiftKey) {
                this.shiftKey = false
                this.switchUpperCase(false)
                keyObj.div.classList.remove('active')
            }

            //Voice input
            if (code.match(/Speech/) && !this.speechIsOn) {
                this.speechIsOn = true
                this.speech()
            } else if (code.match(/Speech/) && this.speechIsOn) {
                this.speechIsOn = false
                this.speech()
                keyObj.div.classList.remove('active')
            }

            //Switch language
            if (code.match(/Lang/)) this.switchLanguage()

            //On/Off sounds
            if (code.match(/Sound/)) this.activateSounds()

            //Play sounds
            if (storage.get('sounds', true)) {
                if (keyObj.small.match(/back/)) {
                    soundContainer.children[1].play()
                    soundContainer.children[1].currentTime = 0
                } else if (keyObj.small.match(/caps/)) {
                    soundContainer.children[2].play()
                    soundContainer.children[2].currentTime = 0
                } else if (keyObj.small.match(/return/)) {
                    soundContainer.children[3].play()
                    soundContainer.children[3].currentTime = 0
                } else if (keyObj.small.match(/upgrade/)) {
                    soundContainer.children[4].play()
                    soundContainer.children[4].currentTime = 0
                } else {
                    if (this.container.dataset.language === 'ru') {
                        soundContainer.children[0].play()
                        soundContainer.children[0].currentTime = 0
                    } else if (this.container.dataset.language === 'en') {
                        soundContainer.children[5].play()
                        soundContainer.children[5].currentTime = 0
                    }
                }
            }

            if (!this.isCaps) {
                this.printToOutput(keyObj, this.shiftKey ? keyObj.shift : keyObj.small)
            } else if (this.isCaps) {
                if (this.shiftKey) {
                    this.printToOutput(keyObj, keyObj.sub.innerHTML ? keyObj.shift : keyObj.small)
                } else {
                    this.printToOutput(keyObj, !keyObj.sub.innerHTML ? keyObj.shift : keyObj.small)
                }
            }

        } else if (type.match(/keyup|mouseup/)) {
            if (!code.match(/Caps/) && !code.match(/Speech/) && !code.match(/Shift/)) keyObj.div.classList.remove('active')
        }
    }

    speech = () => {
        if (this.speechIsOn) {
            if (this.container.dataset.language === 'ru') {
                this.recognition.lang = 'ru-Latn'
            } else {
                this.recognition.lang = 'en-US'
            }

            this.recognition.onresult = e => {
                let cursorPos = this.output.selectionStart
                const left = this.output.value.slice(0, cursorPos)
                const right = this.output.value.slice(cursorPos)

                const transcript = e.results[0][0].transcript.toLowerCase()

                if (e.results[0].isFinal) {
                    this.output.value = `${left} ${transcript} ${right}`
                    cursorPos = left.length + transcript.length + 1

                    this.output.setSelectionRange(cursorPos, cursorPos)
                }
            }

            this.recognition.onend = () => this.recognition.start()
            this.recognition.start()
        } else {
            this.recognition.stop()
            this.recognition.onresult = null
            this.recognition.onend = null
        }
    }

    switchLanguage = () => {
        const langAbbr = Object.keys(language)
        let langIdx = langAbbr.indexOf(this.container.dataset.language)
        this.keyBase = langIdx + 1 < langAbbr.length ? language[langAbbr[langIdx += 1]]
            : language[langAbbr[langIdx -= langIdx]]

        this.container.dataset.language = langAbbr[langIdx]
        storage.set('kbLang', langAbbr[langIdx])

        this.keyButtons.forEach(button => {
            const keyObj = this.keyBase.find(key => key.code === button.code)
            if (!keyObj) return;
            button.shift = keyObj.shift
            button.small = keyObj.small
            if (keyObj.shift && keyObj.shift.match(/[^a-zA-Zа-яА-ЯёЁ0-9]/g)) {
                button.sub.innerHTML = keyObj.shift
            } else {
                button.sub.innerHTML = ''
            }

            if (button.code === 'SoundButton') {
                if (storage.get('sounds', true)) {
                    button.letter.innerHTML = '<div class="material-icons">volume_up</div>'
                } else {
                    button.letter.innerHTML = '<div class="material-icons">volume_off</div>'
                }
            } else {
                button.letter.innerHTML = keyObj.small
            }
        })

        if (this.isCaps) this.switchUpperCase(true)
    }

    switchUpperCase(isTrue) {
        if (isTrue) {
            this.keyButtons.forEach(button => {
                if (button.sub) {
                    if (this.shiftKey) {
                        button.sub.classList.add('sub-active')
                        button.letter.classList.add('sub-inactive')
                    }
                }

                if (!button.isFnKey && this.isCaps && !this.shiftKey && !button.sub.innerHTML) {
                    button.letter.innerHTML = button.shift
                } else if (!button.isFnKey && this.isCaps && this.shiftKey) {
                    button.letter.innerHTML = button.small
                } else if (!button.isFnKey && !button.sub.innerHTML) {
                    button.letter.innerHTML = button.shift
                }
            })
        } else {
            this.keyButtons.forEach(button => {
                if (button.sub.innerHTML && !button.isFnKey) {
                    button.sub.classList.remove('sub-active')
                    button.letter.classList.remove('sub-inactive')

                    if (!this.isCaps) {
                        button.letter.innerHTML = button.small
                    } else if (!this.isCaps) {
                        button.letter.innerHTML = button.shift
                    }
                } else if (!button.isFnKey) {
                    if (this.isCaps) {
                        button.letter.innerHTML = button.shift
                    } else {
                        button.letter.innerHTML = button.small
                    }
                }
            })
        }
    }

    printToOutput(keyObj, symbol) {
        let cursorPos = this.output.selectionStart
        const left = this.output.value.slice(0, cursorPos)
        const right = this.output.value.slice(cursorPos)

        const fnButtonsHandler = {
            Tab: () => {
                this.output.value = `${left}\t${right}`
                cursorPos += 1
            },
            ArrowLeft: () => {
                cursorPos = cursorPos - 1 >= 0 ? cursorPos - 1 : 0
            },
            ArrowRight: () => {
                cursorPos += 1
            },
            ArrowUp: () => {
                const positionFromLeft = this.output.value.slice(0, cursorPos).match(/(\n).*$(?!\1)/g) || [[1]]
                cursorPos -= positionFromLeft[0].length
            },
            ArrowDown: () => {
                const positionFromLeft = this.output.value.slice(cursorPos).match(/^.*(\n).*(?!\1)/) || [[1]]
                cursorPos += positionFromLeft[0].length
            },
            Enter: () => {
                this.output.value = `${left}\n${right}`
                cursorPos += 1
            },
            Delete: () => {
                this.output.value = `${left}${right.slice(1)}`
            },
            Backspace: () => {
                this.output.value = `${left.slice(0, -1)}${right}`
                cursorPos -= 1
            },
            Space: () => {
                this.output.value = `${left} ${right}`
                cursorPos += 1
            }
        }

        if (fnButtonsHandler[keyObj.code]) fnButtonsHandler[keyObj.code]()

        else if (!keyObj.isFnKey) {
            cursorPos += 1
            this.output.value = `${left}${symbol || ''}${right}`
        }
        this.output.setSelectionRange(cursorPos, cursorPos)
    }
}
