# Império IA — Mesa de Consignado

Sistema de apoio operacional para análise de crédito consignado, inicialmente
voltado ao convênio INSS.

O Império IA recebe um extrato INSS em PDF, identifica os dados do benefício e
dos contratos, recalcula a taxa aproximada e compara cada contrato com os
roteiros operacionais cadastrados.

> O resultado é uma pré-análise operacional. A aprovação definitiva depende da
> política vigente do banco, da tabela comercial, da CIP, da Dataprev e das
> demais validações exigidas na contratação.

## Acesso ao sistema

O sistema publicado está disponível em:

[Acessar o Império IA](https://imperio-ia-consignado.grupo-imperio.chatgpt.site)

Qualquer pessoa com o endereço pode abrir a tela inicial, mas o conteúdo do
sistema exige um token válido fornecido pelo Grupo Império.

Os tokens:

- são validados no servidor;
- não ficam expostos no código ou no GitHub;
- permanecem válidos até serem removidos ou substituídos;
- criam uma sessão protegida por cookie seguro durante sete dias;
- podem ser encerrados pelo botão **Sair**.

## Principais funcionalidades

- Upload de extrato INSS em PDF.
- Leitura automática realizada no navegador.
- Extração dos dados cadastrais, bancários e financeiros.
- Identificação dos contratos ativos.
- Leitura de banco, parcela, quitação, prazo e número do contrato.
- Cálculo da taxa mensal aproximada.
- Comparação automática com 15 bancos cadastrados.
- Priorização da portabilidade com refinanciamento.
- Portabilidade pura apresentada somente como última alternativa.
- Destaque visual da primeira sugestão de banco.
- Justificativa para operações possíveis, bloqueadas ou que exigem revisão.
- Consulta dos roteiros operacionais por banco.
- Atualização de roteiros por PDF.
- Chat direcionado a dúvidas de crédito consignado.
- Área de simulações bancárias, iniciando pelo refinanciamento C6.
- Conector local do Chrome que mantém a credencial bancária fora do site.
- Calculadora do Cidadão integrada.
- Interface responsiva para computador e celular.
- Tela de acesso protegida por token.

## Bancos cadastrados

Atualmente, o motor INSS compara os contratos com:

- Quali;
- Facta;
- BMG;
- PAN;
- Banrisul;
- iCred;
- Finanto;
- Digio;
- Daycoval;
- C6 Bank;
- BRB;
- Happy;
- Acredto;
- Quero Mais Crédito;
- Total Cash.

As regras consideram, conforme o roteiro de cada banco:

- espécie do benefício;
- idade atual ou idade ao final do contrato;
- banco de origem;
- saldo de quitação;
- valor da parcela;
- parcelas pagas;
- prazo restante;
- margem disponível ou negativa;
- restrições por estado e município;
- modalidade da operação.

## Fluxo da análise

1. O operador anexa o extrato INSS em PDF.
2. O sistema extrai os dados do cliente, benefício e contratos.
3. A taxa de cada contrato é recalculada.
4. Cada contrato é comparado com os roteiros ativos.
5. O sistema apresenta a primeira sugestão de banco.
6. As demais possibilidades aparecem em ordem de prioridade.
7. Os bancos que exigem revisão ou não operam ficam disponíveis na comparação
   completa, acompanhados do motivo.

O motor sempre prioriza portabilidade com refinanciamento entre as operações
possíveis. A portabilidade pura fica no final da lista e deve ser utilizada
quando o refinanciamento não for viável.

## Calculadora do Cidadão

A aba **Calculadora** reproduz o cálculo de financiamento com prestações fixas
do Banco Central.

Campos disponíveis:

- número de meses;
- taxa de juros mensal;
- valor da prestação;
- valor financiado.

Preencha exatamente três campos e deixe em branco o campo que deseja calcular.
O resultado é preenchido automaticamente.

Para estimar a taxa de um contrato INSS:

1. informe as parcelas restantes;
2. informe o valor da parcela;
3. informe o saldo de quitação;
4. deixe a taxa mensal em branco;
5. clique em **Calcular agora**.

O resultado é aproximado. O saldo oficial da portabilidade deve ser confirmado
pela CIP.

## Simulação de refinanciamento C6

A aba **Simulações** inicia a automação do refinanciamento de carteira INSS no
portal C6. O operador envia o extrato normalmente. Quando o sistema identifica
um contrato de carteira C6, abre a área de simulação, consulta o portal em
segundo plano e apresenta no Império IA:

- tabela;
- descrição da tabela;
- taxa de juros mensal;
- valor da parcela;
- valor liberado ao cliente;
- prazo.

Não é necessário instalar extensão, abrir outra aba ou digitar novamente o CPF.
O acesso bancário fica somente nas variáveis secretas do servidor e nunca é
enviado ao navegador nem incluído no GitHub.

Cada contrato de origem C6 também exibe o botão **Simular no C6**. Quando há
mais de uma parcela, o sistema envia número do contrato e valor da parcela para
selecionar a linha correta no portal.

O perfil utilizado no C6 precisa exibir
**Cadastro > Proposta Consignado**. A credencial deve ser exclusiva da
integração: se o mesmo usuário estiver conectado em outra estação, o sistema
interrompe a consulta sem derrubar a sessão existente e apresenta uma mensagem
clara.

A integração automatiza somente a simulação. Ela não grava proposta e não
conclui contratação.

## Privacidade

- O PDF do extrato é processado localmente no navegador.
- O arquivo não é armazenado pelo sistema.
- Quando há contrato C6, somente o CPF identificado é enviado ao servidor para
  executar a consulta bancária solicitada.
- CPF e número do benefício aparecem mascarados na interface.
- Casos reais e dados pessoais de clientes não devem ser adicionados ao
  repositório.
- O projeto não possui integração ativa com o Bevi Ajuda.
- Tokens válidos são armazenados somente como hashes.
- Credenciais do C6 não fazem parte do código e ficam apenas nas variáveis
  secretas da hospedagem.
- A chave utilizada para assinar a sessão fica nas variáveis protegidas da
  hospedagem.
- A página de acesso limita tentativas repetidas no mesmo ponto de conexão.

## Requisitos para desenvolvimento

- Node.js `22.13.0` ou superior;
- npm;
- Git.

## Instalação

Clone o repositório e instale as dependências:

```bash
git clone https://github.com/felps061-ip/imperio-IA.git
cd imperio-IA
npm install
```

Se o projeto já estiver baixado neste computador, abra o PowerShell e entre
diretamente na pasta:

```powershell
cd "C:\Users\imper\OneDrive\Documentos\imperio-IA"
npm install
npm run dev
```

Os comandos precisam ser executados nessa pasta, onde está o arquivo
`package.json`. Depois, abra no navegador o endereço exibido pelo terminal.

Inicie o ambiente local:

```bash
npm run dev
```

Depois, abra o endereço informado no terminal.

## Comandos disponíveis

```bash
# Iniciar o ambiente de desenvolvimento
npm run dev

# Gerar a versão de produção
npm run build

# Executar o sistema em produção local
npm run start

# Gerar a versão e executar todos os testes
npm test

# Verificar a qualidade do código
npm run lint

# Gerar uma nova lista privada com 10 tokens
npm run access:generate -- 10
```

O comando de geração cria:

- `outputs/tokens-acesso-imperio.txt`: lista privada para distribuição;
- `.dev.vars`: hashes dos tokens e segredo da sessão para desenvolvimento.

Esses arquivos são ignorados pelo Git e nunca devem ser enviados ao GitHub. Ao
trocar a lista de tokens, as variáveis protegidas da hospedagem também precisam
ser atualizadas.

Para habilitar a simulação automática do C6, configure também:

```dotenv
C6_CONSIG_USER=usuario_exclusivo_da_integracao
C6_CONSIG_PASSWORD=senha_protegida_da_integracao
```

Em produção, ambas devem ser cadastradas como variáveis secretas. Não use esse
mesmo usuário em outra estação durante as consultas automáticas.

## Estrutura principal

```text
app/
  globals.css                 Estilos e responsividade
  layout.tsx                  Metadados e estrutura geral
  page.tsx                    Interface, upload, chat e calculadora

lib/
  inss-extrato.mjs            Parser do extrato e motor de regras
  citizen-calculator.mjs      Cálculos de prestações fixas
  c6-server.mjs               Automação protegida da simulação C6
  c6-webforms.mjs             Leitura e envio dos formulários do portal C6
  token-auth.mjs              Validação de tokens e assinatura de sessão

tests/
  inss-parser.test.mjs        Testes de extração e comparação bancária
  citizen-calculator.test.mjs Testes da calculadora
  c6-server.test.mjs          Teste integral do fluxo bancário simulado
  c6-webforms.test.mjs        Testes dos formulários e ofertas do C6
  token-auth.test.mjs         Testes da autenticação
  rendered-html.test.mjs      Testes de renderização e privacidade

public/                       Identidade visual da Império
scripts/                      Geração segura da lista de tokens
worker/index.ts               Proteção de acesso no servidor
.openai/hosting.json          Configuração da hospedagem
```

## Atualização dos roteiros

Uma regra nova não deve ser publicada automaticamente.

Fluxo recomendado:

1. receber o novo roteiro operacional;
2. identificar banco, convênio, produto, modalidade, versão e vigência;
3. comparar com a versão anterior;
4. registrar alterações, exceções e conflitos;
5. atualizar o motor de regras;
6. adicionar ou atualizar os testes;
7. revisar a alteração;
8. publicar somente após a validação de um responsável.

Em caso de regra desconhecida ou conflito entre documentos, o sistema deve
classificar a operação como **Revisar**, nunca como aprovação automática.

## Testes

A suíte atual verifica:

- leitura dos campos do extrato;
- identificação dos contratos;
- cálculo da taxa mensal;
- classificação das espécies do INSS;
- comparação com os 15 bancos;
- restrições geográficas;
- priorização da portabilidade com refinanciamento;
- fluxo completo da simulação C6 com respostas controladas;
- bloqueio seguro quando o usuário C6 já está ativo em outra estação;
- cálculos de meses, taxa, prestação e valor financiado;
- validação da privacidade na interface;
- renderização da aplicação.

Execute:

```bash
npm test
```

## Tecnologias

- React 19;
- Next.js 16;
- TypeScript;
- vinext;
- Vite;
- PDF.js;
- Tailwind CSS;
- Cloudflare/Sites;
- Node.js.

## Aviso operacional

O Império IA auxilia o correspondente na triagem dos contratos, mas não
substitui a consulta aos sistemas oficiais, a conferência do roteiro vigente
nem a análise final da instituição financeira.
