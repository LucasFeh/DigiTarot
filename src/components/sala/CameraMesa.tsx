import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Backend, Sessao, SinalMidia } from '../../lib/backend'
import { novoToken } from '../../lib/backend/local'
import { criarPeer, oferecer, receberResposta, responder } from '../../lib/webrtc'
import { limitarQuadro, redimensionarQuadro, PROPORCAO_CAMERA_RETRATO, type DirecaoAjuste, type QuadroCamera } from '../../lib/posicaoCamera'
import ReconhecimentoCamera from './ReconhecimentoCamera'
import type { TemaBaralho } from '../../lib/temas/tipos'
import { guiasDaCamera, type CartaReconhecida } from '../../lib/posicaoCartaCamera'
import { SPREAD_BY_ID } from '../../data/spreads'

const ALCAS: { direcao: DirecaoAjuste; posicao: string; cursor: string }[] = [
  { direcao: 'nw', posicao: 'left-1 top-1', cursor: 'cursor-nwse-resize' },
  { direcao: 'n', posicao: 'left-1/2 top-1 -translate-x-1/2', cursor: 'cursor-ns-resize' },
  { direcao: 'ne', posicao: 'right-1 top-1', cursor: 'cursor-nesw-resize' },
  { direcao: 'e', posicao: 'right-1 top-1/2 -translate-y-1/2', cursor: 'cursor-ew-resize' },
  { direcao: 'se', posicao: 'bottom-1 right-1', cursor: 'cursor-nwse-resize' },
  { direcao: 's', posicao: 'bottom-1 left-1/2 -translate-x-1/2', cursor: 'cursor-ns-resize' },
  { direcao: 'sw', posicao: 'bottom-1 left-1', cursor: 'cursor-nesw-resize' },
  { direcao: 'w', posicao: 'left-1 top-1/2 -translate-y-1/2', cursor: 'cursor-ew-resize' },
]

export type CameraMesaHandle = { abrirConfiguracao: () => void; encerrar: () => Promise<void> }

export default function CameraMesa({ backend, sessao, ehTarologo, cameraRef, onConexao, onAudio, onFonteMicrofone, temaBaralho, onCartaReconhecida }: {
  backend: Backend
  sessao: Sessao
  ehTarologo: boolean
  cameraRef?: React.Ref<CameraMesaHandle>
  onConexao?: (conectada: boolean) => void
  onAudio?: (stream: MediaStream | null) => void
  onFonteMicrofone?: (fonte: 'pc' | 'app') => void
  temaBaralho?: TemaBaralho | null
  onCartaReconhecida?: (carta: CartaReconhecida) => boolean
}) {
  const [configuracaoAberta, setConfiguracaoAberta] = useState(false)
  const [fonteCamera, setFonteCamera] = useState<'pc' | 'app'>('app')
  const [fonteMicrofone, setFonteMicrofone] = useState<'pc' | 'app'>('pc')
  const [erro, setErro] = useState('')
  const [appSinal, setAppSinal] = useState<SinalMidia | null>(null)
  const [dispositivoVinculado, setDispositivoVinculado] = useState('')
  const [videoSinal, setVideoSinal] = useState<SinalMidia | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [recebido, setRecebido] = useState<MediaStream | null>(null)
  const [posicaoLocal, setPosicaoLocal] = useState<{ x: number; y: number } | null>(null)
  const [tamanhoLocal, setTamanhoLocal] = useState<number | null>(null)
  const [proporcao, setProporcao] = useState(PROPORCAO_CAMERA_RETRATO)
  const [salaTamanho, setSalaTamanho] = useState({ largura: 0, altura: 0 })
  const cameraPc = useRef<RTCPeerConnection | null>(null)
  const streamPc = useRef<MediaStream | null>(null)
  const fonteCameraAtual = useRef<'pc' | 'app'>('app')
  const videoPc = useRef<RTCPeerConnection | null>(null)
  const videoEl = useRef<HTMLVideoElement>(null)
  const arrastando = useRef<{ dx: number; dy: number; ultimo: { x: number; y: number } | null } | null>(null)
  const redimensionando = useRef<{ x: number; y: number; direcao: DirecaoAjuste; area: { largura: number; altura: number }; inicial: QuadroCamera; ultimo: QuadroCamera } | null>(null)
  const processada = useRef('')
  const processadoVideo = useRef('')
  const versaoVideo = useRef('')
  const teveStream = useRef(false)
  const filaVideo = useRef<Promise<void>>(Promise.resolve())
  const pos = sessao.cameraPosicao ?? { x: 58, y: 20 }
  const posicao = posicaoLocal ?? pos
  const cameraAtiva = ehTarologo ? stream : recebido
  // A visibilidade agora segue a transmissão da fonte escolhida. O aplicativo
  // liga/desliga a própria transmissão; a mesa não mantém um segundo interruptor.
  const visivel = true
  const tamanho = tamanhoLocal ?? sessao.cameraTamanho ?? 34
  const quadro = limitarQuadro({ ...posicao, largura: tamanho }, salaTamanho, proporcao)
  const salvarVideo = useCallback((dados: Partial<SinalMidia>) => {
    // A troca rápida de fonte não pode deixar um "desligar" antigo sobrescrever
    // a nova oferta para o cliente no mesmo documento de sinalização.
    filaVideo.current = filaVideo.current.catch(() => {}).then(() => backend.salvarSinal(sessao.id, 'video', dados))
    return filaVideo.current
  }, [backend, sessao.id])

  useEffect(() => {
    if (!cameraAtiva || !visivel || !videoEl.current) return
    const sala = videoEl.current.parentElement?.parentElement
    if (!sala) return
    const observar = new ResizeObserver(() => setSalaTamanho({ largura: sala.clientWidth, altura: sala.clientHeight }))
    observar.observe(sala)
    return () => observar.disconnect()
  }, [cameraAtiva, visivel])

  useEffect(() => { onConexao?.(Boolean(stream)) }, [onConexao, stream])

  useEffect(() => {
    if (!ehTarologo) return
    return backend.observarSinal(sessao.id, 'app-camera', (s) => {
      setAppSinal(s)
      if (s && !s.oferta && cameraPc.current) {
        cameraPc.current?.close()
        cameraPc.current = null
        processada.current = ''
        if (fonteCameraAtual.current === 'app') setStream(null)
        onAudio?.(null)
      }
    })
  }, [backend, sessao.id, ehTarologo, onAudio])

  useEffect(() => {
    if (!ehTarologo) return
    return backend.observarVinculacaoCamera(sessao.tarologoUid, (v) => setDispositivoVinculado(v?.dispositivoId ?? ''))
  }, [backend, sessao.tarologoUid, ehTarologo])

  useEffect(() => {
    if (!cameraPc.current || appSinal?.dispositivoId === dispositivoVinculado) return
    cameraPc.current?.close()
    cameraPc.current = null
    processada.current = ''
    if (fonteCameraAtual.current === 'app') setStream(null)
    onAudio?.(null)
  }, [appSinal?.dispositivoId, dispositivoVinculado, onAudio])

  useEffect(() => backend.observarSinal(sessao.id, 'video', (s) => {
    setVideoSinal(s)
    if (!ehTarologo && s && !s.oferta) {
      videoPc.current?.close()
      videoPc.current = null
      processadoVideo.current = ''
      setRecebido(null)
    }
  }), [backend, sessao.id, ehTarologo])

  useEffect(() => {
    const precisaApp = fonteCamera === 'app' || fonteMicrofone === 'app'
    const oferta = precisaApp && appSinal?.dispositivoId && appSinal.dispositivoId === dispositivoVinculado ? appSinal.oferta : undefined
    if (!ehTarologo || !oferta || oferta === processada.current) return
    processada.current = oferta
    cameraPc.current?.close()
    const pc = criarPeer()
    cameraPc.current = pc
    pc.ontrack = (e) => {
      const proximo = e.streams[0] ?? new MediaStream([e.track])
      if (e.track.kind === 'video' && fonteCameraAtual.current === 'app') setStream(proximo)
      if (e.track.kind === 'audio') onAudio?.(new MediaStream([e.track]))
      e.track.onended = () => {
        if (cameraPc.current !== pc) return
        if (e.track.kind === 'video') {
          if (fonteCameraAtual.current === 'app') setStream(null)
        } else onAudio?.(null)
      }
    }
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' && cameraPc.current === pc) {
        if (fonteCameraAtual.current === 'app') setStream(null)
        onAudio?.(null)
      }
    }
    void responder(pc, oferta)
      .then((resposta) => backend.salvarSinal(sessao.id, 'app-camera', { resposta }))
      .catch(() => setErro('Não foi possível receber a câmera do aplicativo.'))
  }, [backend, sessao.id, ehTarologo, appSinal?.oferta, appSinal?.dispositivoId, dispositivoVinculado, fonteCamera, fonteMicrofone, onAudio])

  // O computador retransmite ao cliente somente a fonte escolhida.
  useEffect(() => {
    if (!ehTarologo || !stream) return
    teveStream.current = true
    videoPc.current?.close()
    const pc = criarPeer()
    videoPc.current = pc
    stream.getVideoTracks().forEach((t) => pc.addTrack(t, stream))
    const versao = novoToken()
    versaoVideo.current = versao
    void oferecer(pc)
      .then((oferta) => {
        if (videoPc.current !== pc) return
        return salvarVideo({ tipo: 'video', versao, oferta, resposta: '' })
      })
      .catch(() => setErro('Não foi possível mostrar a câmera ao cliente.'))
    return () => { pc.close() }
  }, [ehTarologo, stream, salvarVideo])

  useEffect(() => {
    if (ehTarologo && !stream && teveStream.current) {
      teveStream.current = false
      void salvarVideo({ oferta: '', resposta: '' }).catch(() => {})
    }
  }, [ehTarologo, stream, salvarVideo])

  useEffect(() => {
    if (!ehTarologo || !videoSinal?.resposta || videoSinal.versao !== versaoVideo.current || !videoPc.current) return
    void receberResposta(videoPc.current, videoSinal.resposta).catch(() => setErro('A conexão de vídeo falhou.'))
  }, [ehTarologo, videoSinal?.resposta, videoSinal?.versao])

  useEffect(() => {
    if (ehTarologo || !videoSinal?.oferta || videoSinal.oferta === processadoVideo.current) return
    processadoVideo.current = videoSinal.oferta
    videoPc.current?.close()
    const pc = criarPeer()
    videoPc.current = pc
    pc.ontrack = (e) => {
      setRecebido(e.streams[0] ?? new MediaStream([e.track]))
      e.track.onended = () => { if (videoPc.current === pc) setRecebido(null) }
    }
    void responder(pc, videoSinal.oferta)
      .then((resposta) => backend.salvarSinal(sessao.id, 'video', { resposta }))
      .catch(() => setErro('Não foi possível abrir o vídeo da mesa.'))
  }, [backend, sessao.id, ehTarologo, videoSinal?.oferta])

  useEffect(() => {
    if (videoEl.current) videoEl.current.srcObject = cameraAtiva
  }, [cameraAtiva, sessao.cameraModo, visivel])

  useEffect(() => () => {
    cameraPc.current?.close()
    videoPc.current?.close()
    streamPc.current?.getTracks().forEach((faixa) => faixa.stop())
    onAudio?.(null)
  }, [onAudio])

  const selecionarCamera = async (fonte: 'pc' | 'app') => {
    if (fonte === fonteCamera && (fonte !== 'pc' || streamPc.current)) return
    fonteCameraAtual.current = fonte
    setFonteCamera(fonte)
    setErro('')
    if (fonte === 'app' || fonteMicrofone !== 'app') {
      cameraPc.current?.close()
      cameraPc.current = null
      processada.current = ''
      onAudio?.(null)
    }
    streamPc.current?.getTracks().forEach((faixa) => faixa.stop())
    streamPc.current = null
    setStream(null)
    if (fonte === 'pc') {
      try {
        const novoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        if (fonteCameraAtual.current !== 'pc') {
          novoStream.getTracks().forEach((faixa) => faixa.stop())
          return
        }
        streamPc.current = novoStream
        setStream(novoStream)
      } catch {
        setErro('Não foi possível abrir a câmera do computador. Confira a permissão no navegador.')
      }
    }
    void backend.atualizarSessao(sessao.id, { cameraVisivel: true })
      .catch(() => setErro('Não foi possível atualizar a visualização da câmera.'))
  }

  const selecionarMicrofone = (fonte: 'pc' | 'app') => {
    setFonteMicrofone(fonte)
    onFonteMicrofone?.(fonte)
    if (fonte === 'pc' && fonteCameraAtual.current === 'pc') {
      cameraPc.current?.close()
      cameraPc.current = null
      processada.current = ''
      onAudio?.(null)
    }
  }

  useImperativeHandle(cameraRef, () => ({
    abrirConfiguracao: () => setConfiguracaoAberta(true),
    encerrar: async () => {
      streamPc.current?.getTracks().forEach((faixa) => faixa.stop())
      streamPc.current = null
    },
  }))

  const modo = sessao.cameraModo ?? 'sobreposta'
  const selecionarModo = (novoModo: 'sobreposta' | 'camera') => void backend.atualizarSessao(sessao.id, {
    cameraModo: novoModo, cameraVisivel: true,
  }).catch(() => setErro('Não foi possível trocar a visualização.'))

  const iniciarRedimensionamento = (e: React.PointerEvent<HTMLButtonElement>, direcao: DirecaoAjuste) => {
    e.stopPropagation()
    const sala = e.currentTarget.parentElement?.parentElement?.getBoundingClientRect()
    if (!sala) return
    const area = { largura: sala.width, altura: sala.height }
    const inicial = limitarQuadro({ ...posicao, largura: tamanho }, area, proporcao)
    redimensionando.current = { x: e.clientX, y: e.clientY, direcao, area, inicial, ultimo: inicial }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const moverRedimensionamento = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    const gesto = redimensionando.current
    if (!gesto) return
    gesto.ultimo = redimensionarQuadro(gesto.inicial, gesto.direcao, e.clientX - gesto.x, e.clientY - gesto.y, gesto.area, proporcao)
    setPosicaoLocal({ x: gesto.ultimo.x, y: gesto.ultimo.y })
    setTamanhoLocal(gesto.ultimo.largura)
  }

  const terminarRedimensionamento = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    const gesto = redimensionando.current
    if (!gesto) return
    redimensionando.current = null
    e.currentTarget.releasePointerCapture(e.pointerId)
    void backend.atualizarSessao(sessao.id, {
      cameraPosicao: { x: gesto.ultimo.x, y: gesto.ultimo.y },
      cameraTamanho: gesto.ultimo.largura,
    }).catch(() => setErro('Não foi possível salvar o tamanho da câmera.'))
  }

  return (
    <>
      {cameraAtiva && (visivel || ehTarologo) && (
        <div
          className={`absolute z-20 overflow-hidden border border-gold/50 bg-black shadow-2xl ${modo === 'camera' ? 'inset-0' : 'rounded-2xl'} ${!visivel ? 'pointer-events-none opacity-0' : ''}`}
          inert={!visivel}
          style={modo === 'camera' ? undefined : { left: `${quadro.x}%`, top: `${quadro.y}%`, width: `${quadro.largura}%`, aspectRatio: proporcao, touchAction: ehTarologo ? 'none' : undefined }}
          onPointerDown={ehTarologo && modo === 'sobreposta' ? (e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            arrastando.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top, ultimo: null }
            e.currentTarget.setPointerCapture(e.pointerId)
          } : undefined}
          onPointerMove={ehTarologo && modo === 'sobreposta' ? (e) => {
            const deslocamento = arrastando.current
            const caixa = e.currentTarget.parentElement?.getBoundingClientRect()
            if (!deslocamento || !caixa) return
            const maxX = (caixa.width - e.currentTarget.offsetWidth) / caixa.width * 100
            const maxY = (caixa.height - e.currentTarget.offsetHeight) / caixa.height * 100
            const proxima = {
              x: Math.max(0, Math.min(maxX, (e.clientX - deslocamento.dx - caixa.left) / caixa.width * 100)),
              y: Math.max(0, Math.min(maxY, (e.clientY - deslocamento.dy - caixa.top) / caixa.height * 100)),
            }
            deslocamento.ultimo = proxima
            setPosicaoLocal(proxima)
          } : undefined}
          onPointerUp={ehTarologo && modo === 'sobreposta' ? (e) => {
            const ultimo = arrastando.current?.ultimo
            if (!arrastando.current) return
            arrastando.current = null
            if (ultimo) void backend.atualizarSessao(sessao.id, { cameraPosicao: ultimo })
            e.currentTarget.releasePointerCapture(e.pointerId)
          } : undefined}
          onPointerCancel={() => { arrastando.current = null; setPosicaoLocal(null) }}
        >
          <video
            ref={videoEl}
            autoPlay muted playsInline
            onResize={(e) => {
              const { videoWidth, videoHeight } = e.currentTarget
              if (videoWidth && videoHeight) setProporcao(videoWidth / videoHeight)
            }}
            onLoadedMetadata={(e) => {
              const { videoWidth, videoHeight } = e.currentTarget
              if (videoWidth && videoHeight) setProporcao(videoWidth / videoHeight)
            }}
            className="absolute inset-0 h-full w-full object-contain"
          />
          {ehTarologo && onCartaReconhecida && <ReconhecimentoCamera videoRef={videoEl} temaBaralho={temaBaralho ?? null} onDeteccao={onCartaReconhecida}
            guias={sessao.cameraGuias ? guiasDaCamera(SPREAD_BY_ID.get(sessao.spreadId) ?? SPREAD_BY_ID.get('una')!, proporcao) : []} spreadId={sessao.spreadId} />}
          {ehTarologo && modo === 'sobreposta' && <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-1 text-[11px] text-white">Arraste para mover</span>}
          {ehTarologo && modo === 'sobreposta' && <div className="absolute bottom-2 right-9 flex items-end gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
            <button type="button" aria-label="Diminuir câmera" onClick={() => {
              const novo = Math.max(18, tamanho - 8)
              setTamanhoLocal(novo)
              void backend.atualizarSessao(sessao.id, { cameraTamanho: novo })
            }} className="rounded-full bg-black/80 px-2.5 py-1 text-lg leading-none text-white">−</button>
            <button type="button" aria-label="Aumentar câmera" onClick={() => {
              const novo = Math.min(85, tamanho + 8)
              setTamanhoLocal(novo)
              void backend.atualizarSessao(sessao.id, { cameraTamanho: novo })
            }} className="rounded-full bg-black/80 px-2.5 py-1 text-lg leading-none text-white">+</button>
          </div>}
          {ehTarologo && modo === 'sobreposta' && ALCAS.map(({ direcao, posicao: alcaPosicao, cursor }) => (
            <button key={direcao} type="button" aria-label={`Redimensionar câmera pelo lado ${direcao}`} title="Arraste para redimensionar"
              className={`absolute z-10 h-4 w-4 rounded-full border-2 border-void bg-gold shadow-lg ${alcaPosicao} ${cursor}`}
              style={{ touchAction: 'none' }}
              onPointerDown={(e) => iniciarRedimensionamento(e, direcao)}
              onPointerMove={moverRedimensionamento}
              onPointerUp={terminarRedimensionamento}
              onPointerCancel={() => { redimensionando.current = null; setPosicaoLocal(null); setTamanhoLocal(null) }}
            />
          ))}
        </div>
      )}

      <div className="pointer-events-auto absolute left-3 top-16 z-30 flex max-w-[calc(100vw-1.5rem)] flex-wrap gap-2">
        {!ehTarologo && !cameraAtiva && videoSinal?.oferta && <span className="glass rounded-full px-3 py-1.5 text-xs text-mist">Conectando câmera…</span>}
        {erro && <span role="alert" className="glass rounded-xl px-3 py-2 text-xs text-rose">{erro}</span>}
      </div>

      {ehTarologo && configuracaoAberta && (
        <div role="dialog" aria-modal="true" aria-label="Configurar câmera e microfone" className="fixed inset-0 z-[110] grid place-items-center bg-black/85 p-4" onClick={() => setConfiguracaoAberta(false)}>
          <div className="max-h-[90svh] w-full max-w-md overflow-y-auto rounded-3xl border border-gold/30 bg-abyss p-6 text-mist shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-2xl text-star">Câmera e microfone</h2>
            <p className="mt-2 text-sm text-mist/75">Escolha de onde vêm a imagem e a voz desta leitura.</p>
            <fieldset className="mt-5 space-y-2">
              <legend className="mb-2 text-sm font-semibold text-gold">Câmera</legend>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/15 p-3"><input type="radio" name="fonte-camera" checked={fonteCamera === 'app'} onChange={() => void selecionarCamera('app')} />Aplicativo DigiTarot</label>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/15 p-3"><input type="radio" name="fonte-camera" checked={fonteCamera === 'pc'} onChange={() => void selecionarCamera('pc')} />Câmera deste computador</label>
              {fonteCamera === 'app' && <p className="text-xs text-mist/65">Ligue ou desligue a transmissão no aplicativo. {dispositivoVinculado ? (stream ? 'Imagem recebida.' : 'Aguardando o aplicativo transmitir.') : 'Vincule o celular no seu perfil.'}</p>}
              {fonteCamera === 'pc' && !stream && <button type="button" onClick={() => void selecionarCamera('pc')} className="text-xs text-gold underline">Tentar abrir a câmera do computador</button>}
            </fieldset>
            <fieldset className="mt-5 space-y-2">
              <legend className="mb-2 text-sm font-semibold text-gold">Visualização padrão</legend>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/15 p-3"><input type="radio" name="modo-camera" checked={modo === 'sobreposta'} onChange={() => selecionarModo('sobreposta')} />Câmera sobre a mesa 3D</label>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/15 p-3"><input type="radio" name="modo-camera" checked={modo === 'camera'} onChange={() => selecionarModo('camera')} />Só a câmera</label>
            </fieldset>
            <fieldset className="mt-5 space-y-2">
              <legend className="mb-2 text-sm font-semibold text-gold">Microfone da conversa por voz</legend>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/15 p-3"><input type="radio" name="fonte-microfone" checked={fonteMicrofone === 'pc'} onChange={() => selecionarMicrofone('pc')} />Microfone deste computador</label>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/15 p-3"><input type="radio" name="fonte-microfone" checked={fonteMicrofone === 'app'} onChange={() => selecionarMicrofone('app')} />Microfone do aplicativo</label>
              <p className="text-xs text-mist/65">Trocar o microfone encerra a conversa por voz atual. Inicie outra para usar a nova fonte.</p>
            </fieldset>
            {erro && <p role="alert" className="mt-3 text-sm text-rose">{erro}</p>}
            <button type="button" onClick={() => setConfiguracaoAberta(false)} className="mt-6 rounded-full border border-gold/50 px-6 py-2 text-gold">Concluir</button>
          </div>
        </div>
      )}
    </>
  )
}
