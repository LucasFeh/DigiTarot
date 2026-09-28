import { useEffect, useState } from 'react'
import { categories } from '../../data/plans'
import { useAuth } from '../../lib/useAuth'
import { TAROLOGO_RODRIGO } from '../../lib/backend/tarologo'
import type { TarologoPix, TarologoPublico } from '../../lib/backend'

const PIX_VAZIO: TarologoPix = { chave: '', nome: '', cidade: '' }
const CAMPO = 'mt-1 w-full rounded-xl border border-white/20 bg-void/50 px-4 py-3 text-[15px] text-star outline-none transition focus:border-gold/70'

function precosDoPerfil(perfil: TarologoPublico): Record<string, string> {
  return Object.fromEntries(Object.entries(perfil.modalidades ?? {}).map(([id, preco]) => [id, String(preco)]))
}

export default function EditorServicosTarologo() {
  const { usuario, backend } = useAuth()
  const [perfil, setPerfil] = useState<TarologoPublico | null>(null)
  const [precos, setPrecos] = useState<Record<string, string>>({})
  const [pix, setPix] = useState<TarologoPix>(PIX_VAZIO)
  const [carregando, setCarregando] = useState(true)
  const [alterouPrecos, setAlterouPrecos] = useState(false)
  const [alterouPix, setAlterouPix] = useState(false)
  const [salvando, setSalvando] = useState<'precos' | 'pix' | null>(null)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!backend || !usuario?.email) return
    return backend.observarTarologo(usuario.email, (atual) => {
      const encontrado = atual ?? (usuario.admin ? TAROLOGO_RODRIGO : null)
      setPerfil(encontrado)
      setPrecos((rascunho) => alterouPrecos || !encontrado ? rascunho : precosDoPerfil(encontrado))
      setCarregando(false)
    })
  }, [backend, usuario?.email, usuario?.admin, alterouPrecos])

  useEffect(() => {
    if (!backend || !usuario?.email || !perfil) return
    return backend.observarPixTarologo(usuario.email, (atual) => {
      if (!alterouPix) setPix(atual ?? PIX_VAZIO)
    })
  }, [backend, usuario?.email, perfil, alterouPix])

  if (!usuario || !backend) return null
  if (carregando) return <p className="text-mist/70">Carregando seus atendimentos…</p>
  if (!perfil) return <div className="max-w-2xl rounded-2xl border border-gold/30 bg-gold/5 p-6 text-mist/80">Seu acesso de tarólogo ainda não foi cadastrado. Peça ao administrador para incluir seu nome e e-mail.</div>

  function alternar(id: string, precoPadrao: number, ativo: boolean) {
    setPrecos((atual) => {
      const proximo = { ...atual }
      if (ativo) proximo[id] = String(precoPadrao)
      else delete proximo[id]
      return proximo
    })
    setAlterouPrecos(true)
    setMensagem('')
  }

  async function salvarPrecos() {
    if (!backend || !usuario?.email || salvando) return
    const modalidades: Record<string, number> = {}
    for (const [id, valor] of Object.entries(precos)) {
      const preco = Number(valor)
      if (!valor.trim() || !Number.isFinite(preco) || preco <= 0 || preco > 10000 || Math.abs(Math.round(preco * 100) - preco * 100) > 1e-6) {
        setErro('Cada leitura selecionada precisa de um preço entre R$ 0,01 e R$ 10.000,00, com até duas casas decimais.')
        return
      }
      modalidades[id] = preco
    }
    setSalvando('precos')
    setErro('')
    setMensagem('')
    try {
      await backend.salvarModalidadesTarologo(usuario.email, modalidades)
      setAlterouPrecos(false)
      setMensagem('Leituras e preços salvos no seu perfil.')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar as leituras.')
    } finally {
      setSalvando(null)
    }
  }

  async function salvarPix() {
    if (!backend || !usuario?.email || salvando) return
    const dados = { chave: pix.chave.trim(), nome: pix.nome.trim(), cidade: pix.cidade.trim() }
    if (!dados.chave || !dados.nome || !dados.cidade || dados.chave.length > 140 || dados.nome.length > 25 || dados.cidade.length > 15) {
      setErro('Preencha a chave Pix, o nome do recebedor (até 25 caracteres) e a cidade (até 15 caracteres).')
      return
    }
    setSalvando('pix')
    setErro('')
    setMensagem('')
    try {
      await backend.salvarPixTarologo(usuario.email, dados)
      setAlterouPix(false)
      setMensagem('Dados Pix salvos. Eles só aparecem para clientes com reserva válida.')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar os dados Pix.')
    } finally {
      setSalvando(null)
    }
  }

  return <div className="max-w-5xl space-y-8">
    <div>
      <p className="text-[12px] uppercase tracking-[0.2em] text-gold">Seu trabalho</p>
      <h2 className="mt-2 font-display text-3xl text-star">Atendimentos e Pix</h2>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-mist/75">Escolha as leituras que você oferece, defina seus valores e informe a conta que receberá os pagamentos.</p>
    </div>

    <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 sm:p-7" aria-labelledby="servicos-titulo">
      <h3 id="servicos-titulo" className="font-display text-xl text-star">Modalidades e preços</h3>
      <p className="mt-2 text-[13px] text-mist/65">Apenas as leituras selecionadas aparecem no seu perfil e no agendamento.</p>
      <div className="mt-6 space-y-5">
        {categories.map((categoria) => <fieldset key={categoria.id} className="rounded-xl border border-white/10 p-4">
          <legend className="px-2 font-display text-[16px] text-star">{categoria.icon} {categoria.title}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {categoria.plans.map((plano) => {
              const ativo = Object.hasOwn(precos, plano.id)
              return <div key={plano.id} className="rounded-xl border border-white/10 bg-void/20 p-3">
                <label className="flex items-start gap-2 text-[13px] text-star"><input type="checkbox" checked={ativo} onChange={(e) => alternar(plano.id, plano.price, e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#d8b978]" /><span>{plano.title}</span></label>
                {ativo && <label className="mt-3 block text-[12px] text-mist/65">Seu preço (R$)<input className={CAMPO} type="number" min="0.01" max="10000" step="0.01" inputMode="decimal" value={precos[plano.id]} onChange={(e) => { setPrecos((atual) => ({ ...atual, [plano.id]: e.target.value })); setAlterouPrecos(true); setMensagem('') }} /></label>}
              </div>
            })}
          </div>
        </fieldset>)}
      </div>
      <button type="button" onClick={() => void salvarPrecos()} disabled={!alterouPrecos || Boolean(salvando)} className="mt-6 rounded-xl bg-gold px-6 py-3 text-[14px] font-semibold text-void disabled:opacity-45">{salvando === 'precos' ? 'Salvando…' : 'Salvar leituras e preços'}</button>
    </section>

    <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 sm:p-7" aria-labelledby="pix-titulo">
      <h3 id="pix-titulo" className="font-display text-xl text-star">Pix profissional</h3>
      <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-mist/65">A chave fica em área privada e aparece ao cliente após a reserva. Confira os dados antes de salvar.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <label className="block text-[13px] text-mist/75 sm:col-span-3">Chave Pix<input className={CAMPO} value={pix.chave} onChange={(e) => { setPix((atual) => ({ ...atual, chave: e.target.value })); setAlterouPix(true); setMensagem('') }} maxLength={140} autoComplete="off" /></label>
        <label className="block text-[13px] text-mist/75 sm:col-span-2">Nome do recebedor<input className={CAMPO} value={pix.nome} onChange={(e) => { setPix((atual) => ({ ...atual, nome: e.target.value })); setAlterouPix(true); setMensagem('') }} maxLength={25} /></label>
        <label className="block text-[13px] text-mist/75">Cidade<input className={CAMPO} value={pix.cidade} onChange={(e) => { setPix((atual) => ({ ...atual, cidade: e.target.value })); setAlterouPix(true); setMensagem('') }} maxLength={15} /></label>
      </div>
      <button type="button" onClick={() => void salvarPix()} disabled={!alterouPix || Boolean(salvando)} className="mt-6 rounded-xl bg-gold px-6 py-3 text-[14px] font-semibold text-void disabled:opacity-45">{salvando === 'pix' ? 'Salvando…' : 'Salvar dados Pix'}</button>
    </section>
    {erro && <p role="alert" className="rounded-xl border border-rose/40 bg-rose/10 p-4 text-[13px] text-rose">{erro}</p>}
    {mensagem && <p role="status" className="rounded-xl border border-gold/35 bg-gold/10 p-4 text-[13px] text-gold">{mensagem}</p>}
  </div>
}
