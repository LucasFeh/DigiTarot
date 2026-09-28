import { useEffect, useRef, useState } from 'react'
import type { Backend, SinalMidia } from '../../lib/backend'
import { novoToken } from '../../lib/backend/local'
import { criarPeer, oferecer, receberResposta, responder } from '../../lib/webrtc'

export default function VozMesa({ backend, sessaoId, autor, microfoneCelular, fonteMicrofone = 'pc' }: {
  backend: Backend
  sessaoId: string
  autor: 'tarologo' | 'cliente'
  microfoneCelular?: MediaStream | null
  fonteMicrofone?: 'pc' | 'app'
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
  const fonteExterna = useRef(false)
  const fonteEmUso = useRef<'pc' | 'app' | null>(null)

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
    fonteExterna.current = false
    fonteEmUso.current = null
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
      const faixaCelular = autor === 'tarologo' && fonteMicrofone === 'app' ? microfoneCelular?.getAudioTracks().find((t) => t.readyState === 'live') : undefined
      if (autor === 'tarologo' && fonteMicrofone === 'app' && !faixaCelular) {
        setEstado('Ligue a transmissão e o microfone no aplicativo para iniciar a voz.')
        return
      }
      setEstado(faixaCelular ? 'Ligando o microfone do celular…' : 'Abrindo microfone…')
      // Clonar evita que "Silenciar" ou "Sair da voz" desligue a faixa da
      // transmissão de câmera, que continua pertencendo ao aplicativo.
      const stream = faixaCelular
        ? new MediaStream([faixaCelular.clone()])
        : await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false })
      fonteExterna.current = Boolean(faixaCelular)
      if (autor === 'tarologo') fonteEmUso.current = fonteMicrofone
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
      fonteExterna.current = false
      fonteEmUso.current = null
      setEstado('Não foi possível abrir a voz. Confira a permissão do microfone e tente novamente.')
    } finally {
      iniciando.current = false
    }
  }

  useEffect(() => {
    if (autor === 'tarologo' && ativo && fonteEmUso.current && fonteEmUso.current !== fonteMicrofone) fechar()
  // A troca de dispositivo encerra a chamada atual; o tarólogo inicia outra.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autor, ativo, fonteMicrofone])

  useEffect(() => {
    if (autor !== 'tarologo' || fonteMicrofone !== 'app') return
    if (!microfoneCelular?.getAudioTracks().some((t) => t.readyState === 'live')) {
      if (fonteExterna.current) fechar()
      return
    }
    if (!ativo) void entrar()
  // A chegada de uma nova faixa do celular inicia a voz uma vez. O botão
  // continua disponível para o tarólogo reiniciar se a chamada cair.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [microfoneCelular, fonteMicrofone])

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
            {autor === 'tarologo' ? fonteMicrofone === 'app' ? 'Iniciar voz pelo aplicativo' : 'Iniciar voz pelo computador' : sinal?.oferta ? 'Entrar na voz' : 'Aguardando chamada'}
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
