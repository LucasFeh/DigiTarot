export default function ArmazenamentoPage() {
  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-3xl px-5 py-16 text-mist">
      <p className="text-xs uppercase tracking-[0.3em] text-gold">Informações do site</p>
      <h1 className="mt-4 font-display text-4xl text-star">Cookies e armazenamento</h1>
      <p className="mt-6 leading-7">
        O DigiTarot usa recursos do navegador para manter o acesso à conta e guardar preferências de uso.
        Esses recursos incluem armazenamento local, armazenamento da sessão e IndexedDB. Alguns serviços
        externos usados para login e proteção contra abuso também podem usar cookies ou recursos semelhantes.
      </p>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-2xl text-star">Para que servem</h2>
        <ul className="list-disc space-y-3 pl-6 leading-7">
          <li><strong className="text-star">Login:</strong> o Firebase Authentication mantém a conta conectada entre visitas, até a pessoa sair ou limpar os dados do navegador.</li>
          <li><strong className="text-star">Preferências:</strong> o site guarda escolhas como a qualidade visual e opções da sala.</li>
          <li><strong className="text-star">Temas e imagens:</strong> certos dados criados no navegador podem ser guardados localmente para continuar disponíveis ao voltar à página.</li>
          <li><strong className="text-star">Proteção:</strong> o reCAPTCHA e o Firebase App Check ajudam a detectar uso automatizado. Esses serviços são fornecidos pelo Google.</li>
        </ul>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-2xl text-star">Suas opções</h2>
        <p className="leading-7">
          Você pode limpar os dados deste site nas configurações do navegador. Isso pode encerrar sua sessão
          e remover preferências ou temas que estejam salvos apenas neste dispositivo. Desativar o
          armazenamento necessário pode impedir o login e outras funções do site.
        </p>
        <p className="leading-7">
          O código atual do DigiTarot não inclui Google Analytics, pixels de anúncios ou rastreadores de
          marketing. Esta página descreve o armazenamento usado pelo site; as configurações de serviços
          externos podem mudar e são verificadas na versão publicada.
        </p>
      </section>
    </main>
  )
}
