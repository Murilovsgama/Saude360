# Websupply-Minimal-Front
 
Este projeto foi desenvolvido para **padronizar o desenvolvimento front-end da Websupply**.  
Ele simplifica **a criação e configuração dos projetos** e oferece uma estrutura escalável e produtiva para projetos em Vue.js.


## 1. Criação do Projeto

Cria o projeto em um novo diretório com o nome especificado. Exemplo:
```bash
npx create-websupply-minimal-front <project-name> 
```

Cria o projeto no diretório atual. Certifique-se de que o diretório está vazio ou contém apenas arquivos que não entrarão em conflito com o boilerplate. Examplo:
```bash
npx create-websupply-minimal-front .
```

Opções de Deploy

O comando aceita a flag --deploy-mode para definir o tipo de build:

- **cloud (padrão)** → prepara o projeto para **CI/CD em nuvem**  
- **legacy** → mantém os scripts locais de compilação (`scripts/compilation.js`) 

**Se nenhuma opção for passada, o modo usado será o _cloud_**

Exemplos:
```
npx create-websupply-minimal-front meu-projeto --deploy-mode=cloud
npx create-websupply-minimal-front meu-projeto --deploy-mode=legacy
npx create-websupply-minimal-front meu-projeto  # usa cloud por padrão
 ```

### Estrutura do projeto
Após a execução do comando, a seguinte estrutura será criada:

```
<project-name>/ 
├── .github/workflows/   # Arquivos de configuração do GitHub Actions para automação de CI/CD.
├── .vscode              # Configurações específicas para o Visual Studio Code, como preferências de editor e extensões.
├── scripts/             # Scripts utilizados para automação de tarefas.
├── src/                 # Código fonte principal do aplicativo
    ├── assets/          # Arquivos estáticos (imagens, fontes, ícones, etc.)
    ├── pages/           # Contém os componentes principais de cada página da aplicação (views).
    ├── router/          # Arquivos de configuração do Vue Router para controle de navegação.
    ├── shared/          # Código reutilizável em toda a aplicação
        ├── components/  # Componentes compartilhados entre diferentes páginas ou seções.
        ├── helpers/     # Funções auxiliares reutilizáveis.
        ├── services/    # Serviços para comunicação com APIs ou outras lógicas de negócio.
        ├── stores/      # Armazenamento de estado (pinia).
        ├── types/       # Types e Interfaces.
    ├── app.vue          # Componente raiz da aplicação.
    ├── main.ts          # Arquivo de entrada da aplicação, onde a instância do Vue é criada.
├── .editorconfig        # Configurações de estilo de código compartilhadas entre editores de texto.
├── .env.development     # Variáveis de ambiente para o ambiente de desenvolvimento.
├── .env.hml             # Variáveis de ambiente para o ambiente de homologação.
├── .env.production      # Variáveis de ambiente para o ambiente de produção.
├── prettierrc.json      # Configurações do Prettier para formatação de código.
├── .versionrc           # Configurações para controle de versão, como versão do projeto.
├── .README.md           # Documento com informações sobre o projeto, como instalação e uso.
├── .gitignore           # Arquivos e pastas ignorados pelo Git.
├── .env.d.ts            # Tipagens TypeScript para variáveis de ambiente.
├── eslint.config.js     # Configurações do ESLint para análise estática de código.
├── index.html           # Arquivo HTML principal, ponto de entrada do aplicativo Vue.
├── package.json         # Dependências, scripts e informações do projeto Node.js.
├── postcss.config.js    # Configurações do PostCSS, usado para processamento de CSS.
├── tailwind.config.js   # Configurações do Tailwind CSS, biblioteca de design utilitária.
├── tsconfig.json        # Configurações do TypeScript para compilar o código.
├── vite.config.ts       # Configurações do Vite, bundler moderno para otimização do app.

```

## 2. Configuração do Projeto

Após a criação do projeto, é necessário realizar algumas configurações para garantir seu funcionamento correto.

1. Certifique-se de executar o comando ```npm install``` para instalar as dependencias do projeto.

2. Acesse o diretório `/scripts` e localize o arquivo **`compilation.js`**.  
   Este arquivo é responsável por realizar o build e o push do projeto para o servidor.

3. O script já está implementado e realiza o build e o push automaticamente para os três ambientes: **desenvolvimento**, **homologação** e **produção**.

4. Para configurá-lo, basta atualizar os valores das strings com os caminhos corretos para cada servidor nos trechos abaixo:

   ```javascript
   const dev = "Dev:Destination";  // Caminho para o servidor de desenvolvimento
   const hml = "Hml:Destination";  // Caminho para o servidor de homologação
   const prod = "Prod:Destination"; // Caminho para o servidor de produção
   ```
5. Após realizar essas alterações, o script estará pronto para executar a compilação e o envio para os servidores.


## 3. Variaveis de ambiente
As variáveis de ambiente são usadas para configurar informações específicas de cada ambiente (desenvolvimento, homologação e produção), sem precisar alterar o código diretamente. No boilerplate, já estão disponíveis os seguintes arquivos:

- **`.env.development`**: Configurações para o ambiente de desenvolvimento.  
  Exemplo:
  ```
  VITE_ENV_MODE=development
  VITE_BASE_URL=https://dev-api.example.com
  ``` 
- **`.env.hml`**: Configurações para o ambiente de homologação.
  Exemplo:
  ```
    VITE_ENV_MODE=homologation
    VITE_BASE_URL=https://hml-api.example.com
  ```

- **`.env.production`**: Configurações para o ambiente de homologação.
  Exemplo:
  ```
    VITE_ENV_MODE=production
    VITE_BASE_URL=https://api.example.com
  ```

### Como usar variáveis no código
No Vite, as variáveis de ambiente devem começar com VITE_ para serem acessíveis no código. Você pode usá-las através de import.meta.env. Por exemplo:

```javascript
console.log(import.meta.env.VITE_ENV_MODE); // Exibe o modo atual (e.g., "development")
console.log(import.meta.env.VITE_BASE_URL); // URL base configurada no ambiente
```

## 4. Scripts disponíveis
- **`dev`**: Inicia o servidor de desenvolvimento do Vite (utiliza o .env.development).
- **`build`**: Realiza a verificação de tipos e o build para produção.  
- **`preview`**: Simula o ambiente de produção localmente.  
- **`build-only`**: Faz o build do projeto para produção.  
- **`type-check`**: Verifica tipos do TypeScript.  
- **`lint`**: Corrige problemas de formatação com ESLint.  
- **`format`**: Formata o código com Prettier e ESLint.  
- **`release`**: Cria uma nova versão seguindo o versionamento semântico.  

### Scripts de Build e Preview

- **`build:dev`**: Realiza o build e envia p/ o ambiente de desenvolvimento (utiliza o .env.development).  
- **`build:hml`**: Realiza o build e envia p/ o ambiente de homologação (utiliza o .env.hml).
- **`build:prod`**: Realiza o build e envia p/ o ambiente de produção (utiliza o .env.production).
- **`preview:dev`**: Faz o build para desenvolvimento e inicia o preview local.  
- **`preview:hml`**: Faz o build para homologação e inicia o preview local.  
- **`preview:prod`**: Faz o build para produção e inicia o preview local.

Para executar qualquer um dos comandos mencionados, basta utilizar o **npm run <script-name>**.
Exemplo:
```bash
npm run dev
```


