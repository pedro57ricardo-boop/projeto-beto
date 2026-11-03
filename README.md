# Escola Online

Aplicacao demonstrativa para gestao escolar, lancamento de medias e consulta individual de boletins. Desenvolvida com Next.js 16, React 19, TypeScript, Tailwind CSS 4 e LocalStorage.
## Executar localmente

Requer Node.js compativel com Next.js 16 e npm.
```bash
npm install
npm run dev
Acesse [http://localhost:3000](http://localhost:3000). Para validar a versao de producao:

```bash
npm run lint
npm run build
npm start
## Contas demonstrativas

- Administrador: `admin` / `admin123`
- Alunos: os usuarios estao listados em “Contas para demonstracao” na tela de login; senha inicial `aluno123`.
Os dados iniciais incluem dez alunos ficticios e quatro disciplinas. As medias comecam como `null`. Alunos e disciplinas adicionados, medias, configuracao academica, equipe e contas ficam salvos no LocalStorage deste navegador.

## Rotas
- `/login`: autenticacao demonstrativa.
- `/admin/dashboard`: indicadores e acompanhamento geral.
- `/admin/alunos`: cadastro e consulta de alunos.
- `/admin/disciplinas`: cadastro e associacao de disciplinas.
- `/admin/notas`: lancamento de medias e configuracao da faixa 5,00 a 5,99.
- `/admin/boletim`: consulta administrativa de boletins.
- `/aluno/boletim`: boletim individual do aluno autenticado.
- `/equipe`: identificacao e edicao dos integrantes (ate cinco).

O sistema redireciona sessoes para rotas permitidas pelo perfil. O administrador pode alterar a situacao provisoria da faixa entre 5,00 e 5,99; por padrao, ela fica pendente de confirmacao e nao recebe classificacao definitiva.
## Seguranca e publicacao

Esta implementacao e somente para demonstracao. O LocalStorage e acessivel ao usuario, as senhas ficam em texto local e o controle de acesso ocorre no cliente; isso nao e autenticacao segura nem protecao adequada para dados reais. Antes de publicar com informacoes pessoais, substitua `src/lib/storage.ts` por uma API/backend com banco de dados, senhas protegidas, sessoes seguras e autorizacao no servidor. Nao use as credenciais ou os dados ficticios em producao.

Os nomes da equipe podem ser editados pelo painel administrativo em “Nossa equipe”.
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
