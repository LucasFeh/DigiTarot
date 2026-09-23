import { useEffect, useRef, useState } from 'react'
import type { Backend, SinalMidia } from '../../lib/backend'
import { novoToken } from '../../lib/backend/local'
import { criarPeer, oferecer, receberResposta, responder } from '../../lib/webrtc'

export default function VozMesa({ backend, sessaoId, autor }: {
  backend: Backend
  sessaoId: string
  autor: 'tarologo' | 'cliente'
}) {
  const [sinal, setSinal] = useState<SinalMidia | null>(null)
  const [ativo, setAtivo] = useState(false)
  const [mudo, setMudo] = useState(false)
  const [estado, setEstado] = useState('')
  const pc = useRef<RTCPeerConnection | null>(null)
  const mic = useRef<MediaStream | null>(null)
  const som = useRef<HTMLAudioElement>(null)
  const versao = useRef('')
  const iniciando = useRef(false)

  useEffect(() => backend.observarSinal(sessaoId, 'voz', setSinal), [backend, sessaoId])

  useEffect(() => () => {
    pc.current?.close()
    mic.current?.getTracks().forEach((t) => t.stop())
  }, [])

  useEffect(() => {
    if (autor !== 'tarologo' || !ativo || !sinal?.resposta || sinal.versao !== versao.current || !pc.current) return
    void receberResposta(pc.current, sinal.resposta).catch(() => setEstado('A conexão de voz falhou. Inicie outra chamada.'))
  }, [autor, ativo, sinal?.resposta, sinal?.versao])

  useEffect(() => {
    if (autor !== 'cliente' || !ativo || (sinal?.oferta && sinal.versao === versao.current)) return
    pc.current?.close()
    pc.current = null
    mic.current?.getTracks().forEach((t) => t.stop())
    mic.current = null
    if (som.current) som.current.srcObject = null
    setAtivo(false)
    setEstado('A chamada terminou. Entre novamente se o tarólogo reiniciar a voz.')
  }, [autor, ativo, sinal?.oferta, sinal?.versao])

  const fechar = () => {
    pc.current?.close()
    pc.current = null
    mic.current?.getTracks().forEach((t) => t.stop())
    mic.current = null
    if (som.current) som.current.srcObject = null
    setAtivo(false)
    setMudo(false)
    setEstado('')
    if (autor === 'tarologo') {
      void backend.salvarSinal(sessaoId, 'voz', { oferta: '', resposta: '' }).catch(() => {})
    }
  }

  const entrar = async () => {
    if (iniciando.current || ativo) return
    if (!window.RTCPeerConnection || !navigator.mediaDevices?.getUserMedia) {
      setEstado('O navegador precisa de HTTPS e acesso ao microfone para a chamada.')
      return
    }
    if (autor === 'cliente' && !sinal?.oferta) return
    iniciando.current = true
    try {
      setEstado('Abrindo microfone…')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false })
      mic.current = stream
      const conexao = criarPeer()
      pc.current = conexao
      stream.getAudioTracks().forEach((t) => conexao.addTrack(t, stream))
      conexao.ontrack = (e) => {
        if (som.current) {
          som.current.srcObject = e.streams[0] ?? new MediaStream([e.track])
          void som.current.play().catch(() => setEstado('Toque em “Ouvir” para liberar o som.'))
        }
      }
      conexao.onconnectionstatechange = () => {
        if (conexao.connectionState === 'connected') setEstado('Voz conectada')
        if (conexao.connectionState === 'failed') setEstado('A rede impediu a chamada. Tente novamente.')
      }
      if (autor === 'tarologo') {
        const novaVersao = novoToken()
        versao.current = novaVersao
        const oferta = await oferecer(conexao)
        await backend.salvarSinal(sessaoId, 'voz', { tipo: 'voz', versao: novaVersao, oferta, resposta: '' })
        setEstado('Esperando o cliente entrar na voz…')
      } else {
        versao.current = sinal!.versao
        const resposta = await responder(conexao, sinal!.oferta!)
        await backend.salvarSinal(sessaoId, 'voz', { resposta })
        setEstado('Conectando voz…')
      }
      setAtivo(true)
    } catch {
      pc.current?.close()
      mic.current?.getTracks().forEach((t) => t.stop())
      pc.current = null
      mic.current = null
      setEstado('Não foi possível abrir a voz. Confira a permissão do microfone e tente novamente.')
    } finally {
      iniciando.current = false
    }
  }

  const alternarMudo = () => {
    const proximo = !mudo
    mic.current?.getAudioTracks().forEach((t) => { t.enabled = !proximo })
    setMudo(proximo)
  }

  return (
    <div className="shrink-0 border-b border-white/10 px-3 py-2 text-[12px] text-mist">
      <audio ref={som} autoPlay playsInline />
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-auto text-mist/70">Conversa por voz</span>
        {!ativo ? (
          <button type="button" onClick={() => void entrar()} disabled={autor === 'cliente' && !sinal?.oferta} className="rounded-full border border-gold/40 px-3 py-1.5 text-gold disabled:cursor-default disabled:opacity-50">
            {autor === 'tarologo' ? 'Iniciar voz' : sinal?.oferta ? 'Entrar na voz' : 'Aguardando chamada'}
          </button>
        ) : (
          <>
            <button type="button" onClick={alternarMudo} className="rounded-full border border-white/20 px-3 py-1.5">{mudo ? 'Ativar microfone' : 'Silenciar'}</button>
            <button type="button" onClick={() => void som.current?.play()} className="rounded-full border border-white/20 px-3 py-1.5">Ouvir</button>
            <button type="button" onClick={fechar} className="rounded-full border border-rose/40 px-3 py-1.5 text-rose">Sair da voz</button>
          </>
        )}
      </div>
      {estado && <p role="status" className="mt-1 text-mist/60">{estado}</p>}
    </div>
  )
}
