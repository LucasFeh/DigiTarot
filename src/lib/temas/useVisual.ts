import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../useAuth'
import { usePerfil } from '../perfil'
import { BARALHO_PADRAO } from './embutidos'
import { lerEspelho, gravarEspelho } from './espelho'
import { escolhasDaSessao, resolverVisual, SEM_ESCOLHA } from './visibilidade'
import type { EscolhaVisual, Sessao, Usuario } from '../backend'

export type Visual = {
  /** Já resolvido para quem está olhando. É isto que a cena recebe. */
  visivel: EscolhaVisual
  /** O que EU escolhi, sem herança. É o que o seletor marca. */
  minha: EscolhaVisual
  doOutro: EscolhaVisual
  ehTarologo: boolean
  espelhando: boolean
  /** Falso quando ninguém entrou na sala: não há o que espelhar. */
  podeEspelhar: boolean
  escolher: (p: Partial<EscolhaVisual>) => void
  espelhar: (v: boolean) => void
}

/**
 * A cola entre sessão, papel e interruptor. Uma chamada só, e ela vem ANTES
 * dos early returns da SalaPage — hook não pode ficar atrás de `if`.
 */
export function useVisual(sessao: Sessao | null | undefined, usuario: Usuario | null): Visual {
  const { backend } = useAuth()
  const { perfil } = usePerfil(usuario)
  const sessaoId = sessao?.id ?? ''
  const [espelhando, setEspelhando] = useState(false)

  // O interruptor é lido do storage quando a sala troca, e não na renderização:
  // ler storage a cada render é trabalho síncrono à toa.
  useEffect(() => {
    setEspelhando(sessaoId ? lerEspelho(sessaoId) : false)
  }, [sessaoId])

  // O papel é o DESTA sessão, nunca `usuario.papel`: um tarólogo que entra na
  // sala de outro tarólogo é cliente ali.
  const ehTarologo = Boolean(usuario && sessao && usuario.uid === sessao.tarologoUid)
  const escolhas = sessao ? escolhasDaSessao(sessao) : { tarologo: SEM_ESCOLHA, cliente: SEM_ESCOLHA }
  /** O que está gravado NA SESSÃO. É sobre isto que `escolher` escreve. */
  const daSessao = ehTarologo ? escolhas.tarologo : escolhas.cliente
  const doOutro = ehTarologo ? escolhas.cliente : escolhas.tarologo

  /**
   * O padrão do perfil entra AQUI, preenchendo o que a sessão não disse — e
   * não dentro de `resolverTema`. É o que mantém a tabela-verdade de doze
   * linhas intacta: a função pura continua recebendo "minha escolha" e "a do
   * outro", só que agora "minha" pode vir do perfil.
   *
   * Consequência que vale saber: um cliente COM tema padrão no perfil deixa de
   * herdar o do tarólogo, porque ele passou a ter escolha própria. A herança
   * segue valendo para quem não escolheu nada em lugar nenhum.
   */
  const minha: EscolhaVisual = {
    baralhoId: daSessao.baralhoId ?? perfil.padrao.baralhoId,
    panoId: daSessao.panoId ?? perfil.padrao.panoId,
  }

  const podeEspelhar = Boolean(sessao?.clienteUid)
  const ativo = espelhando && podeEspelhar

  const bruto = resolverVisual(ehTarologo, minha, doOutro, ativo)
  /**
   * Ninguém escolheu nada em lugar nenhum: a mesa nasce no baralho que vem com
   * o site, e não na arte desenhada. O SVG continua existindo como rede de
   * segurança — `useTexturaCarta` cai nele quando uma imagem do tema falha.
   */
  const visivel: EscolhaVisual = { ...bruto, baralhoId: bruto.baralhoId ?? BARALHO_PADRAO }

  const espelhar = useCallback(
    (v: boolean) => {
      if (!sessaoId) return
      gravarEspelho(sessaoId, v)
      setEspelhando(v)
    },
    [sessaoId],
  )

  const escolher = useCallback(
    (p: Partial<EscolhaVisual>) => {
      if (!backend || !sessao) return
      // Base é o que está NA SESSÃO, não o efetivo: senão trocar só o baralho
      // congelaria o pano do perfil dentro da sessão, e mudar o padrão depois
      // não teria mais efeito nenhum naquela leitura.
      const nova: EscolhaVisual = { ...daSessao, ...p }
      // Dois ramos EXPLÍCITOS e não `{ [campo]: nova }`: uma chave computada de
      // tipo união produz `{ [x: string]: EscolhaVisual }`, que não é
      // atribuível a `Partial<Sessao>` e derruba o `tsc -b` do build.
      const patch: Partial<Sessao> = ehTarologo ? { visualTarologo: nova } : { visualCliente: nova }
      // Com `.catch`: hoje as chamadas são feitas com `void` e uma recusa do
      // backend sumiria sem deixar rastro no console.
      void backend.atualizarSessao(sessao.id, patch).catch((e) => console.warn('não deu para salvar o tema', e))

      // Mexer no próprio tema é sair do espelho. Sem isto, o tarólogo trocaria
      // de baralho e a mesa não mudaria — o acervo pareceria quebrado.
      if (ativo) espelhar(false)
    },
    [backend, sessao, daSessao, ehTarologo, ativo, espelhar],
  )

  return { visivel, minha, doOutro, ehTarologo, espelhando: ativo, podeEspelhar, escolher, espelhar }
}
