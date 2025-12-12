# 🚀 Deploy na Vercel - LogiTrack ERP

Este guia explica como fazer o deploy do LogiTrack ERP na Vercel.

## ✅ Pré-requisitos

- Conta na [Vercel](https://vercel.com)
- Conta no [GitHub](https://github.com) (repositório já configurado)
- Projeto configurado no Supabase (ou Firebase)

---

## 📋 Passo a Passo

### 1. Prepare o Repositório

Certifique-se de que todas as alterações estão commitadas e enviadas para o GitHub:

```bash
git add .
git commit -m "Preparando para deploy na Vercel"
git push origin main
```

### 2. Importe o Projeto na Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login
2. Clique em **"Add New..."** → **"Project"**
3. Selecione o repositório **`Caas2023/09-0po-p`**
4. Clique em **"Import"**

### 3. Configure as Variáveis de Ambiente

Na página de configuração do projeto, adicione as seguintes variáveis de ambiente:

#### Para usar Supabase:

| Nome | Valor | Descrição |
|------|-------|-----------|
| `VITE_DB_PROVIDER` | `SUPABASE` | Define qual banco usar |
| `VITE_SUPABASE_URL` | `https://wtzuwojbxjlfovehmacp.supabase.co` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` | Chave anônima do Supabase |

#### Opcional - Para usar Firebase:

| Nome | Valor | Descrição |
|------|-------|-----------|
| `VITE_DB_PROVIDER` | `FIREBASE` | Define qual banco usar |
| `VITE_FIREBASE_API_KEY` | Sua API Key | Firebase API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Seu Auth Domain | Firebase Auth Domain |
| `VITE_FIREBASE_PROJECT_ID` | Seu Project ID | Firebase Project ID |

#### Opcional - Para usar LocalStorage:

| Nome | Valor | Descrição |
|------|-------|-----------|
| `VITE_DB_PROVIDER` | `LOCAL` | Usar apenas LocalStorage (dados no navegador) |

> [!IMPORTANT]
> **Não compartilhe** as chaves de API publicamente. A Vercel armazena essas variáveis de forma segura.

### 4. Configure o Build

A Vercel detecta automaticamente que é um projeto Vite. As configurações padrão são:

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

> ✅ Não é necessário alterar nada se estiver usando as configurações padrão.

### 5. Deploy

1. Clique em **"Deploy"**
2. Aguarde o build completar (leva cerca de 1-2 minutos)
3. Após o deploy, você receberá uma URL como: `https://seu-projeto.vercel.app`

---

## 🔄 Deploys Automáticos

Após o primeiro deploy, a Vercel configurará **deploys automáticos**:

- ✅ Todo `git push` para a branch `main` fará um novo deploy em produção
- ✅ Pull Requests geram preview deployments automáticos
- ✅ Cada commit é testado antes de ir para produção

---

## ⚙️ Configuração Avançada

### vercel.json

O arquivo `vercel.json` já está configurado para SPA (Single Page Application):

```json
{
    "rewrites": [
        {
            "source": "/(.*)",
            "destination": "/index.html"
        }
    ]
}
```

Isso garante que todas as rotas do React Router funcionem corretamente.

### Domínio Personalizado

Para usar um domínio próprio:

1. Acesse o projeto na Vercel Dashboard
2. Vá em **Settings** → **Domains**
3. Adicione seu domínio
4. Configure os DNS conforme instruções da Vercel

---

## 🗄️ Banco de Dados

### Opção 1: Supabase (Recomendado)

**Vantagens:**
- ✅ Banco de dados PostgreSQL grátis
- ✅ API REST automática
- ✅ Autenticação integrada
- ✅ Plano gratuito generoso

**Como configurar:**
1. Acesse seu projeto no [Supabase](https://supabase.com)
2. Copie a URL e ANON KEY do projeto
3. Adicione como variáveis de ambiente na Vercel
4. Certifique-se de que as tabelas estão criadas (veja `COMO_CONFIGURAR_BANCO.md`)

### Opção 2: Firebase

**Vantagens:**
- ✅ Firestore NoSQL
- ✅ Integração com Google Cloud
- ✅ Plano gratuito

**Como configurar:**
1. Crie um projeto no [Firebase Console](https://console.firebase.google.com)
2. Copie as credenciais do projeto
3. Adicione como variáveis de ambiente na Vercel

### Opção 3: LocalStorage

**Uso:**
- Para testes e desenvolvimento
- Os dados ficam apenas no navegador do usuário
- Não recomendado para produção

---

## 🐛 Troubleshooting

### Erro: "Environment variables not defined"

**Solução:** Certifique-se de adicionar todas as variáveis de ambiente necessárias na Vercel Dashboard.

### Erro: "Build failed"

**Solução:** 
1. Verifique os logs do build na Vercel
2. Teste o build localmente: `npm run build`
3. Certifique-se de que todas as dependências estão em `package.json`

### Página em branco após deploy

**Solução:**
1. Abra o DevTools Console do navegador
2. Verifique se há erros de JavaScript
3. Confirme que as variáveis de ambiente estão configuradas
4. Verifique se o `vercel.json` está correto

### Rotas não funcionam (404)

**Solução:** Certifique-se de que o arquivo `vercel.json` existe e está configurado corretamente para SPA.

---

## 📊 Monitoramento

Após o deploy, você pode monitorar:

- **Analytics**: Visitas, países, dispositivos
- **Logs**: Erros e warnings em tempo real  
- **Performance**: Web Vitals e métricas de velocidade

Acesse essas informações na Vercel Dashboard do seu projeto.

---

## 🔒 Segurança

### Variáveis de Ambiente

- ✅ Nunca commite o arquivo `.env` no Git
- ✅ Use variáveis de ambiente da Vercel para dados sensíveis
- ✅ O `.gitignore` já está configurado para ignorar `.env`

### HTTPS

- ✅ A Vercel fornece HTTPS automático para todos os deploys
- ✅ Certificados SSL são renovados automaticamente

---

## 📚 Recursos Úteis

- [Documentação da Vercel](https://vercel.com/docs)
- [Vite + Vercel](https://vercel.com/docs/frameworks/vite)
- [Environment Variables](https://vercel.com/docs/environment-variables)
- [Custom Domains](https://vercel.com/docs/custom-domains)

---

## ✨ Próximos Passos

Após o deploy:

1. ✅ Teste a aplicação na URL da Vercel
2. ✅ Configure domínio personalizado (opcional)
3. ✅ Configure monitoramento de erros (opcional)
4. ✅ Ative Analytics da Vercel

---

> 💡 **Dica**: Para fazer um novo deploy, basta fazer `git push`. A Vercel cuida do resto!
