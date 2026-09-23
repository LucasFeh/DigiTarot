import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { Backend, Sessao, SinalMidia } from '../../lib/backend'
import { novoToken } from '../../lib/backend/local'
import { criarPeer, oferecer, receberResposta, responder } from '../../lib/webrtc'

export default function CameraMesa({ backend, sessao, ehTarologo }: {
  backend: Backend
  sessao: Sessao
  ehTarologo: boolean
}) {
  const [token, setToken] = useState<string | null>(null)
  const [qrAberto, setQrAberto] = useState(false)
  const [erro, setErro] = useState('')
  const [cameraSinal, setCameraSinal] = useState<SinalMidia | null>(null)
  const [videoSinal, setVideoSinal] = useState<SinalMidia | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [recebido, setRecebido] = useState<MediaStream | null>(null)
  const [posicaoLocal, setPosicaoLocal] = useState<{ x: number; y: number } | null>(null)
  const cameraPc = useRef<RTCPeerConnection | null>(null)
  const videoPc = useRef<RTCPeerConnection | null>(null)
  const videoEl = useRef<HTMLVideoElement>(null)
  const arrastando = useRef<{ dx: number; dy: number } | null>(null)
  const processada = useRef('')
  const processadoVideo = useRef('')
  const teveStream = useRef(false)
  const pos = sessao.cameraPosicao ?? { x: 58, y: 20 }
  const posicao = posicaoLocal ?? pos
  const cameraAtiva = ehTarologo ? stream : recebido

  useEffect(() => {
    if (!token || !ehTarologo) return
    return backend.observarSinal(sessao.id, `camera-${token}`, (s) => {
      setCameraSinal(s)
      if (s && !s.oferta) {
        cameraPc.current?.close()
        setStream(null)
      }
    })
  }, [backend, sessao.id, token, ehTarologo])

  useEffect(() => backend.observarSinal(sessao.id, 'video', (s) => {
    setVideoSinal(s)
    if (!ehTarologo && s && !s.oferta) {
      videoPc.current?.close()
      setRecebido(null)
    }
  }), [backend, sessao.id, ehTarologo])

  useEffect(() => {
    if (!ehTarologo || !cameraSinal?.oferta || !token || cameraSinal.oferta === processada.current) return
    processada.current = cameraSinal.oferta
    cameraPc.current?.close()
    const pc = criarPeer()
    cameraPc.current = pc
    pc.ontrack = (e) => {
      const proximo = e.streams[0] ?? new MediaStream([e.track])
      setStream(proximo)
      e.track.onended = () => setStream(null)
    }
    void responder(pc, cameraSinal.oferta)
      .then((resposta) => backend.salvarSinal(sessao.id, `camera-${token}`, { resposta }))
      .catch(() => setErro('Não foi possível receber a câmera do celular. Gere outro QR.'))
  }, [backend, sessao.id, ehTarologo, cameraSinal?.oferta, token])

  // O computador do tarólogo recebe o celular e retransmite a mesma faixa ao
  // cliente. O token do QR nunca aparece no documento que o cliente lê.
  useEffect(() => {
    if (!ehTarologo || !stream) return
    teveStream.current = true
    videoPc.current?.close()
    const pc = criarPeer()
    videoPc.current = pc
    stream.getVideoTracks().forEach((t) => pc.addTrack(t, stream))
    const versao = novoToken()
    void oferecer(pc)
      .then((oferta) => backend.salvarSinal(sessao.id, 'video', { tipo: 'video', versao, oferta, resposta: '' }))
      .catch(() => setErro('Não foi possível mostrar a câmera ao cliente.'))
    return () => { pc.close() }
  }, [backend, sessao.id, ehTarologo, stream])

  useEffect(() => {
    if (ehTarologo && !stream && teveStream.current) {
      teveStream.current = false
      void backend.salvarSinal(sessao.id, 'video', { oferta: '', resposta: '' }).catch(() => {})
    }
  }, [backend, sessao.id, ehTarologo, stream])

  useEffect(() => {
    if (!ehTarologo || !videoSinal?.resposta || !videoPc.current) return
    void receberResposta(videoPc.current, videoSinal.resposta).catch(() => setErro('A conexão de vídeo falhou.'))
  }, [ehTarologo, videoSinal?.resposta])

  useEffect(() => {
    if (ehTarologo || !videoSinal?.oferta || videoSinal.oferta === processadoVideo.current) return
    processadoVideo.current = videoSinal.oferta
    videoPc.current?.close()
    const pc = criarPeer()
    videoPc.current = pc
    pc.ontrack = (e) => setRecebido(e.streams[0] ?? new MediaStream([e.track]))
    void responder(pc, videoSinal.oferta)
      .then((resposta) => backend.salvarSinal(sessao.id, 'video', { resposta }))
      .catch(() => setErro('Não foi possível abrir o vídeo da mesa.'))
  }, [backend, sessao.id, ehTarologo, videoSinal?.oferta])

  useEffect(() => {
    if (videoEl.current) videoEl.current.srcObject = cameraAtiva
  }, [cameraAtiva, sessao.cameraModo])

  useEffect(() => () => {
    cameraPc.current?.close()
    videoPc.current?.close()
  }, [])

  const gerarQr = async () => {
    const novo = novoToken()
    try {
      await backend.salvarSinal(sessao.id, `camera-${novo}`, {
        tipo: 'camera', versao: novo, expiraEm: Date.now() + 10 * 60 * 1000, oferta: '', resposta: '',
      })
      cameraPc.current?.close()
      setStream(null)
      setToken(novo)
      setQrAberto(true)
      setErro('')
    } catch {
      setErro('Não foi possível gerar o QR. Confira as regras de acesso do Firebase.')
    }
  }

  const url = token ? `${window.location.origin}${window.location.pathname}#/camera/${sessao.id}/camera-${token}` : ''
  const modo = sessao.cameraModo ?? 'sobreposta'
  const alternarModo = () => void backend.atualizarSessao(sessao.id, {
    cameraModo: modo === 'camera' ? 'sobreposta' : 'camera',
  }).catch(() => setErro('Não foi possível trocar a visualização.'))

  return (
    <>
      {cameraAtiva && (
        <div
          className={`absolute z-20 overflow-hidden border border-gold/50 bg-black shadow-2xl ${modo === 'camera' ? 'inset-0' : 'h-[min(30vh,240px)] w-[min(38vw,360px)] min-w-40 rounded-2xl'}`}
          style={modo === 'camera' ? undefined : { left: `${posicao.x}%`, top: `${posicao.y}%`, touchAction: ehTarologo ? 'none' : undefined }}
          onPointerDown={ehTarologo && modo === 'sobreposta' ? (e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            arrastando.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top }
            e.currentTarget.setPointerCapture(e.pointerId)
          } : undefined}
          onPointerMove={ehTarologo && modo === 'sobreposta' ? (e) => {
            const deslocamento = arrastando.current
            const caixa = e.currentTarget.parentElement?.getBoundingClientRect()
            if (!deslocamento || !caixa) return
            const maxX = (caixa.width - e.currentTarget.offsetWidth) / caixa.width * 100
            const maxY = (caixa.height - e.currentTarget.offsetHeight) / caixa.height * 100
            setPosicaoLocal({
              x: Math.max(0, Math.min(maxX, (e.clientX - deslocamento.dx - caixa.left) / caixa.width * 100)),
              y: Math.max(0, Math.min(maxY, (e.clientY - deslocamento.dy - caixa.top) / caixa.height * 100)),
            })
          } : undefined}
          onPointerUp={ehTarologo && modo === 'sobreposta' ? (e) => {
            if (!arrastando.current) return
            arrastando.current = null
            if (posicaoLocal) void backend.atualizarSessao(sessao.id, { cameraPosicao: posicaoLocal })
            e.currentTarget.releasePointerCapture(e.pointerId)
          } : undefined}
          onPointerCancel={() => { arrastando.current = null; setPosicaoLocal(null) }}
        >
          <video ref={videoEl} autoPlay muted playsInline className="h-full w-full object-contain" />
          {ehTarologo && modo === 'sobreposta' && <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-1 text-[11px] text-white">Arraste para mover</span>}
        </div>
      )}

      <div className="pointer-events-auto absolute left-3 top-16 z-30 flex max-w-[calc(100vw-1.5rem)] flex-wrap gap-2">
        {ehTarologo && (
          <button type="button" onClick={() => void gerarQr()} className="glass rounded-full px-3 py-1.5 text-[13px] text-mist hover:text-star">
            {cameraAtiva ? 'Trocar celular' : 'Conectar câmera do celular'}
          </button>
        )}
        {ehTarologo && cameraAtiva && (
          <button type="button" onClick={alternarModo} className="glass rounded-full px-3 py-1.5 text-[13px] text-mist hover:text-star">
            {modo === 'camera' ? 'Ver mesa 3D' : 'Ver só câmera'}
          </button>
        )}
        {!ehTarologo && !cameraAtiva && videoSinal?.oferta && <span className="glass rounded-full px-3 py-1.5 text-xs text-mist">Conectando câmera…</span>}
        {erro && <span role="alert" className="glass rounded-xl px-3 py-2 text-xs text-rose">{erro}</span>}
      </div>

      {qrAberto && token && (
        <div role="dialog" aria-modal="true" aria-label="Conectar câmera do celular" className="fixed inset-0 z-[110] grid place-items-center bg-black/85 p-4">
          <div className="w-full max-w-md rounded-3xl border border-gold/30 bg-abyss p-6 text-center text-mist shadow-2xl">
            <h2 className="font-display text-2xl text-star">Câmera do celular</h2>
            <p className="my-3 text-sm">Escaneie com o celular, abra o link e permita usar a câmera. O QR expira em 10 minutos.</p>
            {backend.modo === 'local' && <p className="mb-3 rounded-xl border border-gold/30 p-2 text-xs text-gold">No teste local, o endereço 127.0.0.1 só funciona neste computador. No site publicado, o QR usa o endereço HTTPS.</p>}
            <div className="mx-auto w-fit rounded-xl bg-white p-3"><QRCodeSVG value={url} size={190} /></div>
            <a href={url} target="_blank" rel="noreferrer" className="mt-3 block break-all text-xs text-gold underline">Abrir link neste aparelho</a>
            <p className="mt-3 text-xs">Deixe esta sala aberta no computador durante a transmissão.</p>
            <button type="button" onClick={() => setQrAberto(false)} className="mt-5 rounded-full border border-white/25 px-6 py-2 text-star">{cameraAtiva ? 'Câmera conectada · fechar' : 'Fechar'}</button>
          </div>
        </div>
      )}
    </>
  )
}
