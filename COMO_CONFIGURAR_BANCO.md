# Guia de Configuração de Banco de Dados

Este guia explica como configurar dois tipos de banco de dados modernos para o seu aplicativo: **Supabase** (PostgreSQL) e **Firebase** (NoSQL).

Escolha um deles para seguir. O Supabase é mais parecido com bancos tradicionais (tabelas), enquanto o Firebase é mais flexível (documentos).

---

## Opção 1: Supabase (Recomendado)

O Supabase é uma alternativa open-source ao Firebase, muito fácil de usar.

### Passo 1: Criar Conta e Projeto
1. Acesse [supabase.com](https://supabase.com) e crie uma conta.
2. Clique em "New Project".
3. Dê um nome (ex: `MotoboyLog`) e defina uma senha forte para o banco.
4. Selecione uma região próxima (ex: `Brazil / São Paulo` se disponível, ou `US East`).
5. Aguarde alguns minutos até o projeto ser criado.

### Passo 2: Pegar as Chaves de Acesso
1. No painel do projeto, vá em **Settings** (ícone de engrenagem) -> **API**.
2. Copie a `Project URL`.
3. Copie a chave `anon` `public`.

### Passo 3: Configurar no Aplicativo
1. Na raiz do projeto, crie um arquivo chamado `.env`.
2. Adicione as seguintes linhas:
   ```env
   VITE_DB_PROVIDER=SUPABASE
   VITE_SUPABASE_URL=sua_project_url_aqui
   VITE_SUPABASE_ANON_KEY=sua_chave_anon_aqui
   ```

### Passo 4: Criar as Tabelas
Vá no **SQL Editor** do Supabase e rode este script para criar a estrutura inicial:

```sql
create table clients (
  id uuid primary key default uuid_generate_v4(),
  owner_id text,
  name text,
  email text,
  phone text,
  category text,
  address text,
  cnpj text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table services (
  id uuid primary key default uuid_generate_v4(),
  owner_id text,
  client_id uuid references clients(id),
  cost numeric,
  status text,
  date date,
  pickup_addresses text[],
  delivery_addresses text[]
);
```

---

## Opção 2: Firebase (Google)

### Passo 1: Criar Projeto
1. Acesse [monitor.firebase.google.com](https://console.firebase.google.com/).
2. Clique em "Adicionar projeto" e siga as instruções.

### Passo 2: Configurar Firestore
1. No menu lateral, clique em **Criação** -> **Firestore Database**.
2. Clique em "Criar banco de dados".
3. Comece no **Modo de Teste** (para facilitar o desenvolvimento).

### Passo 3: Pegar as Chaves
1. Clique na engrenagem ao lado de "Visão geral do projeto" -> **Configurações do projeto**.
2. Role até "Seus aplicativos" e clique no ícone da web `</>`.
3. Registre o app e copie as configurações `firebaseConfig` que aparecerem.

### Passo 4: Configurar no Aplicativo
No arquivo `.env`:
```env
VITE_DB_PROVIDER=FIREBASE
VITE_FIREBASE_API_KEY=api_key_aqui
VITE_FIREBASE_AUTH_DOMAIN=projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=id_do_projeto
```
