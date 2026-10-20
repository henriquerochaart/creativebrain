/** Shown where a page needs the database and DATABASE_URL is not set yet (Vercel without Neon). */
export function NoDatabase({ admin = false }: { admin?: boolean }) {
  return (
    <main className="mx-auto flex min-h-[100svh] max-w-lg flex-col justify-center px-5 py-24">
      <div className="card px-6 py-8">
        <p className="font-display text-3xl leading-tight text-bone uppercase">Banco de dados desligado</p>
        {admin ? (
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-base leading-relaxed text-bone-2">
            <li>Na Vercel, abra o projeto e vá em Storage → Create Database → Neon (plano grátis).</li>
            <li>Conecte o banco ao projeto. A Vercel cria a variável DATABASE_URL sozinha.</li>
            <li>Faça um novo deploy. As tabelas são criadas no primeiro acesso.</li>
          </ol>
        ) : (
          <p className="mt-4 text-base leading-relaxed text-bone-2">As entradas abrem em breve. Volte daqui a pouco.</p>
        )}
      </div>
    </main>
  );
}
