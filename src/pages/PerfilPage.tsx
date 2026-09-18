import { useState } from 'react'
import { useAuth } from '../lib/useAuth'
import { usePerfil } from '../lib/perfil'
import { useDesempenho } from '../lib/desempenho'
import LayoutPainel, { type ItemMenu } from '../components/painel/LayoutPainel'
import AvatarEditavel from '../components/temas/AvatarEditavel'
import SeletorDesempenho from '../components/SeletorDesempenho'
import SecaoConta from '../components/perfil/SecaoConta'
import EditorCartaTarologo from '../components/perfil/EditorCartaTarologo'
import LoginPage from './LoginPage'

/**
 * O perfil ficou com duas seções: quem você é, e por onde você entra.
 *
 * Temas e consultas saíram daqui para a Tiragem digital. Os dois pertencem ao
 * momento de usar a mesa, não ao de configurar a conta — e mantê-los no perfil
 * obrigava a pessoa a sair da tiragem para escolher o baralho que ela ia usar
 * na tiragem.
 */
type Secao = 'geral' | 'carta' | 'conta'

const SECOES: ItemMenu<Secao>[] = [
  { id: 'geral', rotulo: 'Geral', icone: '☾' },
  { id: 'conta', rotulo: 'Conta e acessos', icone: '✧' },
]

function Campo({
  rotulo,
  valor,
  onChange,
  placeholder,
  dica,
}: {
  rotulo: string
  valor: string
  onChange: (v: string) => void
  placeholder?: string
  dica?: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] uppercase tracking-[0.14em] text-mist/70">
        {rotulo}
      </span>
      <input
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-[16px] text-star outline-none transition placeholder:text-mist/40 focus:border-lilac/60"
      />
      {dica && <span className="mt-1.5 block text-[13px] text-mist/55">{dica}</span>}
    </label>
  )
}

export default function PerfilPage() {
  const { usuario, carregando } = useAuth()
  const { perfil, salvar, nomeExibido } = usePerfil(usuario)
  const desempenho = useDesempenho(usuario)
  const [secao, setSecao] = useState<Secao>('geral')

  if (carregando) {
    return (
      <main className="grid min-h-[calc(100vh-4rem)] place-items-center">
        <p className="text-[15px] text-mist/70">Carregando…</p>
      </main>
    )
  }
  if (!usuario) return <LoginPage />

  // A foto escolhida no perfil tem prioridade sobre a da conta Google: é a que
  // a pessoa decidiu. Enquanto ela não escolher nenhuma, vale a do Google —
  // ninguém precisa procurar uma foto para não ficar com uma inicial genérica.
  const foto = perfil.foto || usuario.foto || ''
  const secoes: ItemMenu<Secao>[] = usuario.papel === 'tarologo'
    ? [SECOES[0], { id: 'carta', rotulo: 'Minha carta', icone: '✦' }, SECOES[1]]
    : SECOES

  const avatar = foto ? (
    <img src={foto} alt="" className="h-11 w-11 rounded-full object-cover" />
  ) : (
    <span className="grid h-11 w-11 place-items-center rounded-full bg-violet/40 text-[18px] font-semibold text-star">
      {nomeExibido.slice(0, 1).toUpperCase()}
    </span>
  )

  return (
    <LayoutPainel
      titulo={nomeExibido}
      subtitulo={usuario.papel === 'tarologo' ? 'tarólogo' : 'cliente'}
      avatar={avatar}
      itens={secoes}
      atual={secao}
      aoEscolher={setSecao}
    >
      {secao === 'geral' && (
        <div className="glass max-w-3xl rounded-2xl p-7">
          <h2 className="mb-1 font-display text-xl text-star">Seus dados</h2>
          <p className="mb-6 text-[14px] text-mist/70">
            É o que aparece para quem estiver do outro lado da mesa.
          </p>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <AvatarEditavel
              foto={foto}
              inicial={nomeExibido.slice(0, 1).toUpperCase()}
              onFoto={(dataUrl) => salvar({ foto: dataUrl })}
            />

            <div className="flex min-w-0 flex-1 flex-col gap-5">
              <Campo
                rotulo="Nome"
                valor={perfil.nome}
                onChange={(v) => salvar({ nome: v })}
                placeholder={usuario.nome}
                dica="Como você quer ser chamada aqui."
              />
              <Campo
                rotulo="Contato"
                valor={perfil.contato}
                onChange={(v) => salvar({ contato: v })}
                placeholder="WhatsApp, telefone, e-mail…"
              />
              <Campo
                rotulo="Instagram"
                valor={perfil.instagram}
                onChange={(v) => salvar({ instagram: v.replace(/^@+/, '') })}
                placeholder="seu.perfil"
                dica="Sem o arroba."
              />
            </div>
          </div>

          {!perfil.foto && usuario.foto && (
            <p className="mt-6 rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-[13px] leading-relaxed text-mist/70">
              A foto acima é a da sua conta Google. Clique nela para trocar por outra — a partir daí
              o site passa a usar a sua, e nunca mais mexe nisso.
            </p>
          )}

          {/* Desempenho da mesa. Fica junto dos dados, e não numa seção
              própria, porque é um botão só — uma aba inteira para ele faria a
              pessoa procurar mais do que decidir. */}
          <div className="mt-7 border-t border-white/10 pt-6">
            <h3 className="font-display text-[17px] text-star">A mesa no seu aparelho</h3>
            <p className="mb-3 mt-1 text-[14px] leading-relaxed text-mist/70">
              A sala é 3D: velas com luz de verdade, sombra e o pano em textura. Em aparelho mais
              modesto isso pode engasgar — aqui você escolhe o quanto ela gasta.
            </p>
            <SeletorDesempenho
              modo={desempenho.modo}
              leve={desempenho.leve}
              onModo={desempenho.definir}
            />
            <p className="mt-2 text-[13px] leading-relaxed text-mist/55">
              Vale para ESTE aparelho na hora, e vira o padrão dos próximos — quem escolheu “leve”
              no celular não quer “leve” no computador.
            </p>
          </div>

          <p className="mt-7 border-t border-white/10 pt-5 text-[13px] leading-relaxed text-mist/55">
            Salva sozinho, e fica guardado na sua conta. Quem entra ({usuario.email || 'sem e-mail'})
            você muda em “Conta e acessos”.
          </p>
        </div>
      )}

      {secao === 'conta' && <SecaoConta />}
      {secao === 'carta' && usuario.papel === 'tarologo' && <EditorCartaTarologo />}
    </LayoutPainel>
  )
}
