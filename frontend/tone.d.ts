declare module 'tone' {
  const tone: any
  export default tone

  // Named exports (最小限。必要に応じて追加)
  export const PolySynth: any
  export const Synth: any
  export const Transport: any
  export const Draw: any
  export const start: any
  export const now: any
  export const getContext: any
  export const context: any
}

declare module 'tone/build/esm/index.js' {
  const tone: any
  export default tone
  export const PolySynth: any
  export const Synth: any
  export const Transport: any
  export const Draw: any
  export const start: any
  export const now: any
  export const getContext: any
  export const context: any
}
