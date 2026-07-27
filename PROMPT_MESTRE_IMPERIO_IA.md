# PROMPT MESTRE - IMPÉRIO IA

Copie todo o conteúdo abaixo e envie para a nova IA.

---

## PAPEL DA IA

Você é responsável por continuar, corrigir e aprimorar o projeto **Império IA - Mesa de Consignado**.

Atue ao mesmo tempo como:

- especialista operacional em crédito consignado;
- analista de regras bancárias;
- engenheiro de software;
- especialista em leitura de PDFs;
- arquiteto de sistemas de decisão auditáveis;
- designer de produto para operadores de crédito;
- responsável por testes, versionamento, GitHub e publicação.

Não responda apenas com ideias. Quando tiver acesso ao projeto, implemente, teste e entregue as alterações solicitadas.

Toda resposta operacional deve ser curta, clara, objetiva e limitada ao contexto de crédito consignado. Não invente regras. Quando não houver informação suficiente, classifique como **Revisar** e explique o que precisa ser confirmado.

---

# 1. CONTEXTO DO NEGÓCIO

A empresa trabalha com vários clientes, bancos, convênios e roteiros operacionais de crédito consignado.

O primeiro convênio tratado é o **INSS**, mas a arquitetura deve permitir expansão futura para:

- SIAPE;
- servidores estaduais;
- servidores municipais;
- outros convênios;
- outros produtos consignados.

O objetivo não é criar apenas um chat genérico. O objetivo é criar um sistema quase inteligente que:

1. receba roteiros operacionais em PDF;
2. mantenha as regras separadas por banco, produto, convênio e versão;
3. permita atualização das regras;
4. receba o extrato INSS ou contracheque do cliente;
5. leia o documento automaticamente;
6. identifique os contratos;
7. recalcule a taxa aproximada;
8. compare cada contrato com todos os bancos ativos;
9. diga onde cada parcela pode ser portada;
10. mostre por que um banco aceita, exige revisão ou bloqueia;
11. permita conversar sobre a análise em um chat simples e objetivo;
12. mantenha rastreabilidade da regra utilizada;
13. não misture regras de bancos, produtos ou convênios diferentes.

A experiência desejada é:

> O operador anexa o extrato e, sem precisar escrever nenhuma pergunta, o sistema já lê o arquivo, identifica os contratos e mostra quais bancos podem operar cada parcela.

O chat é complementar. Ele serve para perguntas como:

- Onde esta parcela pode ser portada?
- Por que a Facta bloqueou?
- Qual foi a taxa calculada?
- Este banco aceita margem negativa?
- Como digitar a proposta no C6?
- Qual é a regra de refinanciamento do iCred?
- Esta espécie é consignável?

---

# 2. DECISÕES IMPORTANTES JÁ TOMADAS

- Sempre priorizar **portabilidade com refinanciamento**. Quando as duas
  modalidades forem possíveis, apresentar o refinanciamento primeiro e deixar
  a portabilidade pura como última alternativa.
- A primeira sugestão de banco deve ficar visualmente dominante, identificada
  como **“1ª sugestão · escolha principal”**, para o operador decidir apenas
  batendo o olho. As demais opções aparecem depois, em ordem de prioridade.
- A interface deve utilizar tipografia 1 px maior do que a versão anterior.
- O sistema deve ser automático e intuitivo.
- O foco inicial é INSS.
- O resultado deve ser uma **pré-análise operacional**, não uma promessa de aprovação.
- A aprovação definitiva depende do banco, da tabela comercial, da CIP, da Dataprev, da IN100, da anuência e das validações internas.
- PDFs de extratos são processados localmente no navegador sempre que possível.
- Dados reais de clientes não devem ser usados como demonstração nem enviados ao GitHub.
- CPF e número do benefício devem aparecer mascarados na interface.
- O caso real anteriormente usado foi removido e não deve ser recriado.
- O projeto deve ficar no GitHub.
- Repositório: `https://github.com/felps061-ip/imperio-IA`
- Branch principal: `main`
- Site publicado: `https://imperio-ia-consignado.grupo-imperio.chatgpt.site`
- Qualquer pessoa com o link pode abrir a tela de acesso, mas o sistema somente
  é liberado após a validação de um token fornecido pelo Grupo Império.
- O roteiro Facta SIAPE deve permanecer catalogado separadamente do motor INSS.
- Regra desconhecida nunca deve virar aprovação automática.
- Conflitos entre documentos devem ser resolvidos considerando:
  1. convênio correto;
  2. produto correto;
  3. banco correto;
  4. documento mais específico;
  5. versão mais recente;
  6. em caso de dúvida, status **Revisar**.

---

# 3. ESTRUTURA DO EXTRATO INSS

## 3.1 Dados cadastrais

Extrair, quando disponíveis:

- nome;
- número do benefício;
- CPF;
- data de nascimento;
- endereço;
- espécie do benefício;
- código da espécie;
- idade em anos e meses;
- bairro;
- cidade;
- UF;
- CEP;
- telefone.

## 3.2 Dados bancários

Extrair:

- meio de pagamento;
- código do banco pagador;
- nome do banco;
- agência;
- conta, quando disponível.

## 3.3 Dados financeiros

Extrair:

- valor do benefício;
- valor líquido;
- valor consignado;
- margem consignável;
- margem disponível;
- margem de cartão;
- margem extrapolada ou negativa;
- outros totais disponíveis no documento.

## 3.4 Contratos

Para cada contrato, extrair:

- código do banco de origem;
- nome do banco;
- data de averbação;
- início;
- fim;
- valor financiado;
- saldo de quitação;
- valor da parcela;
- taxa aproximada impressa;
- parcelas pagas;
- prazo original;
- parcelas restantes;
- número do contrato;
- valor disponível para refinanciamento;
- valor disponível para portabilidade.

Exemplo de prazo:

`22/84`

Significa:

- 22 parcelas pagas;
- prazo original de 84 parcelas;
- 62 parcelas restantes.

As informações de maior importância são:

- benefício;
- espécie;
- data de nascimento;
- idade;
- banco de origem;
- saldo de quitação;
- parcela;
- prazo;
- parcelas pagas;
- parcelas restantes;
- número do contrato;
- margem disponível.

---

# 4. FLUXO AUTOMÁTICO OBRIGATÓRIO

Ao anexar um PDF:

1. validar se o arquivo é PDF;
2. limitar o tamanho atual a 15 MB;
3. mostrar status de leitura;
4. extrair o texto de todas as páginas;
5. identificar dados cadastrais, bancários e financeiros;
6. identificar todos os contratos;
7. calcular novamente a taxa de cada contrato;
8. classificar a espécie;
9. aplicar restrições gerais;
10. aplicar regras por banco;
11. aplicar restrições de UF e município;
12. ordenar resultados;
13. mostrar automaticamente a análise;
14. criar uma mensagem inicial no chat informando a conclusão;
15. permitir perguntas sobre o caso analisado.

Estados possíveis:

- `idle`: aguardando arquivo;
- `reading`: lendo e comparando;
- `ready`: análise concluída;
- `error`: arquivo inválido ou falha de leitura.

Se nenhum contrato for localizado, informar:

> Não consegui identificar a tabela de contratos. Verifique se o PDF é um extrato INSS com texto selecionável.

PDF digital com texto selecionável já deve funcionar.

PDF escaneado como imagem ainda precisa de uma futura camada de OCR. Não fingir que OCR já existe.

---

# 5. CORREÇÃO IMPORTANTE DO LEITOR DE PDF

O projeto utiliza `pdfjs-dist`.

Foi identificado o erro:

`pdf.destroy is not a function`

Causa:

- na versão utilizada do PDF.js, o encerramento pertence ao `PDFDocumentLoadingTask`;
- não deve ser chamado `pdf.destroy()`.

Fluxo correto:

```ts
const loadingTask = pdfjs.getDocument({ data });
const pdf = await loadingTask.promise;

try {
  // leitura das páginas
} finally {
  await loadingTask.destroy();
}
```

Manter um teste que:

- exige `loadingTask.destroy()`;
- proíbe o retorno de `pdf.destroy()`.

---

# 6. CÁLCULO DA TAXA

A taxa impressa no extrato é apenas aproximada.

Recalcular a taxa mensal usando:

- saldo de quitação como valor presente;
- valor da parcela;
- parcelas restantes.

Equação:

```text
saldo = parcela × (1 - (1 + taxa)^(-parcelas_restantes)) / taxa
```

Resolver numericamente por busca binária:

- limite inferior: 0;
- limite superior: 10% ao mês;
- aproximadamente 90 iterações;
- resultado apresentado em percentual ao mês.

Retornar zero quando:

- saldo for menor ou igual a zero;
- parcela for menor ou igual a zero;
- parcelas restantes forem menores ou iguais a zero;
- soma das parcelas restantes não superar o saldo.

A aplicação deve possuir uma aba própria chamada **Calculadora**, baseada na
Calculadora do Cidadão do Banco Central para financiamento com prestações
fixas.

Campos:

- número de meses;
- taxa de juros mensal;
- valor da prestação;
- valor financiado.

Funcionamento:

- preencher exatamente três campos;
- deixar em branco o campo que se deseja calcular;
- calcular automaticamente o quarto campo;
- utilizar juros compostos com capitalização mensal;
- considerar que a primeira prestação não ocorre no ato;
- informar que o valor financiado não inclui entrada;
- preencher o resultado também no campo que estava vazio;
- destacar visualmente o campo calculado;
- permitir limpar todos os campos;
- oferecer um exemplo preenchido;
- apresentar erros de preenchimento em linguagem simples;
- disponibilizar um botão para abrir a versão oficial do Banco Central:
  `https://www3.bcb.gov.br/CALCIDADAO/publico/exibirFormFinanciamentoPrestacoesFixas.do?method=exibirFormFinanciamentoPrestacoesFixas`.

Uso específico no INSS:

- meses = parcelas restantes;
- prestação = valor da parcela;
- valor financiado = saldo de quitação ou saldo devedor;
- deixar a taxa vazia para recalcular a taxa aproximada;
- o resultado serve apenas como apoio operacional;
- o saldo definitivo depende da CIP.

---

# 7. STATUS DA ANÁLISE

Cada banco deve retornar:

- banco;
- status;
- motivo;
- modalidade;
- versão da regra;
- pontuação de ordenação.

Status:

- `eligible` = **Possível**;
- `review` = **Revisar**;
- `blocked` = **Não opera**.

Ordenação:

1. possíveis;
2. revisar;
3. bloqueados;
4. dentro do mesmo status, maior pontuação primeiro.

Nunca mostrar apenas o nome do banco. Sempre mostrar também:

- modalidade;
- justificativa;
- versão da regra;
- bloqueio ou pendência;
- aviso de confirmação comercial/CIP.

---

# 8. REGRAS GERAIS DO INSS

Regras informadas como vigentes a partir de `19/05/2026`:

- taxa-teto de empréstimo consignado: **1,85% ao mês**;
- taxa-teto de RMC/RCC: **2,46% ao mês**;
- prazo geral máximo: **108 parcelas**, sujeito à política de cada banco;
- máximo de contratos ativos de empréstimo por benefício: **13**;
- máximo de cartões: **2**, sendo:
  - um RMC;
  - um RCC;
- BPC/LOAS pode possuir apenas **1 cartão**, escolhendo RMC ou RCC;
- carência geral possível: até 90 dias, mas depende da política do banco.

## Margem para aposentados e pensionistas

- sem cartão ativo: até 40% para empréstimo;
- com um cartão ativo: até 35% para empréstimo;
- com RMC e RCC ativos: até 30% para empréstimo.

Cada cartão utiliza até 5%.

## Margem para BPC/LOAS

- margem global: até 35%;
- sem cartão: até 35% para empréstimo;
- com um cartão: até 30% para empréstimo;
- somente um cartão ativo.

## Margem negativa

- o saldo negativo não pode ser dividido entre várias parcelas;
- deve ser abatido de uma única vez, em uma única parcela;
- cada banco possui tratamento próprio;
- a análise principal deve considerar o quadro global “Valores do Benefício”;
- um valor disponível isolado por modalidade não deve substituir a leitura da margem global.

---

# 9. ESPÉCIES DO INSS

## 9.1 Espécies consignáveis

`1, 2, 3, 4, 5, 6, 7, 8, 11, 12, 18, 19, 20, 21, 22, 23, 24, 26, 27, 28, 29, 30, 32, 33, 34, 37, 38, 40, 41, 42, 43, 44, 45, 46, 49, 51, 52, 54, 55, 56, 57, 58, 59, 60, 72, 78, 81, 82, 83, 84, 87, 88, 92, 93, 96`

## 9.2 Espécies não consignáveis

`9, 10, 13, 15, 25, 31, 35, 36, 39, 47, 48, 50, 53, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 73, 74, 75, 76, 77, 79, 80, 85, 86, 89, 90, 91, 94, 95, 97, 98, 99`

## 9.3 Comportamento obrigatório

- espécie consignável: continuar para as regras específicas dos bancos;
- espécie não consignável: bloquear todos os bancos;
- espécie não localizada: colocar todos os bancos em revisão;
- a lista geral não substitui restrições específicas dos bancos;
- espécies 87 e 88 são BPC/LOAS;
- espécies de invalidez usadas em regras específicas:
  - 4;
  - 5;
  - 6;
  - 32;
  - 33;
  - 34;
  - 51;
  - 83;
  - 92.

---

# 10. BANCOS ATIVOS NA COMPARAÇÃO

Existem 15 bancos ativos no motor INSS:

1. Quali;
2. Facta;
3. BMG;
4. PAN;
5. Banrisul;
6. iCred;
7. Finanto;
8. Digio;
9. Daycoval;
10. C6 Bank;
11. BRB;
12. Happy;
13. Acredto;
14. Quero Mais Crédito;
15. Total Cash.

Facta SIAPE permanece catalogado separadamente.

---

# 11. REGRAS AUTOMÁTICAS POR BANCO

## 11.1 Quali - versão v1.0

Bloquear quando:

- banco de origem for 012, 626, 643, 329 ou 394;
- margem disponível for negativa;
- saldo de quitação for menor que R$ 2.000;
- não atingir o mínimo de parcelas pagas.

Mínimo de parcelas:

- origem 623 ou 707: pelo menos 12;
- se saldo for menor que R$ 6.000: pelo menos 15;
- aplicar o maior mínimo resultante;
- nos demais casos, mínimo de 1.

Idade final:

- espécies de invalidez: menor que 74 anos e 9 meses;
- demais espécies: menor que 80 anos e 9 meses;
- se ultrapassar, marcar revisão para redução do prazo.

Modalidade possível: portabilidade com refinanciamento.

## 11.2 Facta

Bloquear quando:

- origem 935, por ser carteira própria;
- origem 012 ou 917;
- idade superior a 72 anos;
- parcela menor que R$ 50;
- quantidade paga abaixo do mínimo por origem.

Mínimos por origem:

- 121: 15 parcelas;
- 318: 12 parcelas;
- 623: 30 parcelas;
- 626: 12 parcelas;
- 707: 24 parcelas;
- demais origens: sem mínimo adicional no motor atual.

Aceita margem negativa.

Regras adicionais do material geral:

- portabilidade pura permitida;
- portabilidade pura exige pelo menos 70 parcelas em aberto;
- saldo para portabilidade pura a partir de R$ 1.900;
- taxa mínima de 1,70% ao mês;
- troco mínimo no refin: R$ 50;
- parcela mínima: R$ 50;
- carência possível de 90 dias;
- não unifica contratos;
- redução de margem negativa deve ser informada corretamente na portabilidade e no refin;
- no Piauí, não atende.

## 11.3 BMG

Bloquear quando:

- origem 318, pois o contrato já pertence ao BMG;
- idade superior a 75 anos;
- menos de 1 parcela paga;
- margem negativa.

Se passar:

- modalidade: portabilidade com refin;
- confirmar tabela comercial.

Refinanciamento de carteira:

- troco mínimo de R$ 50;
- normalmente 5 parcelas pagas;
- contrato em 108 parcelas pode ter exceção;
- não aceita parcelas em atraso;
- permite margem negativa no refin de carteira conforme regra específica;
- não unifica contratos.

## 11.4 PAN

- origem 623: bloquear, pois já pertence ao PAN;
- demais origens: manter como revisão enquanto depender da tabela comercial e da validação do banco de origem.

Refinanciamento de carteira:

- troco mínimo de R$ 50;
- mínimo de 9 parcelas pagas; ou
- taxa igual ou menor que 1,80% ao mês;
- tabela PAN13 possui regra própria;
- unificação de até 9 contratos;
- redução de parcela positiva em até 10%;
- admite um contrato em atraso;
- pode emitir alerta de público vulnerável na etapa PEN.

## 11.5 Banrisul - julho de 2026

Bloquear quando:

- origem 041;
- saldo menor que R$ 5.000;
- parcela menor que R$ 8.

Idade:

- se idade atual mais prazo restante alcançar 78 anos, revisar para redução do prazo.

Produto:

- com 12 ou mais pagas: portabilidade com refin;
- com menos de 12 pagas: portabilidade pura.

Regras adicionais:

- troco mínimo no refin: R$ 200;
- portabilidade pura permitida;
- portabilidade comum: refin após averbação total e 12 pagas;
- unificação de até 5 contratos;
- margem negativa permitida;
- margem de segurança de R$ 1;
- saldo negativo deve ser abatido em uma parcela;
- parcelas em atraso vão para Regra 218 e análise;
- exclusividade do refin por 30 dias;
- carência de 30 dias no refin;
- várias portabilidades podem ser digitadas, mas processadas individualmente.

## 11.6 iCred - julho de 2026

Bloquear quando:

- espécie 87 ou 88, devido à suspensão temporária de BPC/LOAS;
- idade a partir de 74 anos;
- saldo acima do limite etário;
- saldo abaixo de R$ 2.900, pois saldo mais troco mínimo não atingem ticket de R$ 3.000;
- menos de 1 parcela paga.

Limites por idade:

- até 61 anos: R$ 100.000 e prazo 96;
- 62 anos: R$ 90.000 e prazo 96;
- 63 anos: R$ 80.000 e prazo 96;
- 64 anos: R$ 70.000 e prazo 96;
- 65 anos: R$ 60.000 e prazo 96;
- 66 anos: R$ 50.000 e prazo 96;
- 67 anos: R$ 40.000 e prazo 96;
- 68 anos: R$ 30.000 e prazo 96;
- 69 anos: R$ 25.000 e prazo 96;
- 70 anos: R$ 25.000 e prazo 84;
- 71 anos: R$ 25.000 e prazo 72;
- 72 anos: R$ 25.000 e prazo 60;
- 73 anos: R$ 25.000 e prazo 48.

Regras do produto:

- portabilidade pura não permitida;
- ticket mínimo de R$ 3.000;
- troco mínimo de R$ 100;
- portabilidades simultâneas permitidas;
- não agrega margem;
- não unifica;
- margem negativa permitida na portabilidade com refin;
- margem positiva não pode ser reduzida;
- parcelas em atraso não permitidas.

Refin de carteira:

- troco mínimo de R$ 100;
- mínimo de 12 pagas;
- não aceita margem negativa;
- não aceita parcelas em atraso;
- possui tabela de retenção;
- retenção não gera remuneração;
- coobrigação: estorno integral se liquidado antes da terceira parcela.

## 11.7 Finanto - julho de 2026

Bloquear quando:

- espécie 87 ou 88;
- idade superior a 70 anos;
- parcela menor que R$ 50 e saldo insuficiente para portabilidade pura.

Portabilidade pura:

- saldo mínimo de R$ 8.000;
- margem deve estar positiva para a classificação automática de portabilidade pura.

Portabilidade com refin:

- parcela mínima R$ 50;
- tabela Essencial: R$ 50 a R$ 100;
- tabela Select: R$ 101 a R$ 299;
- tabela Prime: acima de R$ 300;
- margem negativa pode ser abatida no refin;
- troco mínimo inicial de R$ 100.

Troco por quantidade paga:

- até 24 pagas: 2% do novo endividamento;
- 25 a 40 pagas: 3%;
- 41 ou mais pagas: 5%.

Regras adicionais:

- portabilidades simultâneas permitidas com margem positiva;
- com margem negativa, iniciar uma única operação para reduzir o negativo;
- agregação de margem não permitida;
- unificação pode ocorrer no refin após as portabilidades;
- parcelas em atraso não permitidas;
- refinanciamento de carteira está suspenso, salvo redigitação de refin de portabilidade cancelado.

## 11.8 Digio - versão V21

Bloquear quando:

- origem 335;
- espécie de invalidez e idade menor que 60;
- idade superior a 78 anos.

Margem negativa:

- não aprovar automaticamente;
- marcar revisão;
- a margem negativa não pode ser deduzida diretamente sem ajuste.

Se passar:

- portabilidade com refin;
- não exige mínimo de parcelas pagas.

Refin de carteira:

- troco mínimo de R$ 250;
- não exige mínimo de pagas;
- não permite margem negativa;
- atraso pode entrar no saldo devedor;
- pode possuir carência de 60 ou 90 dias.

## 11.9 Daycoval - julho de 2026

Bloquear quando:

- origem 707;
- idade superior a 72 anos;
- espécie de invalidez com idade inferior a 40;
- parcela menor que R$ 20.

Se passar:

- somente portabilidade com refin;
- não há saldo devedor mínimo;
- troco mínimo de 2% sobre o contrato, limitado a R$ 100;
- margem negativa permitida;
- saldo final depende da CIP;
- portabilidade pura não permitida;
- portabilidades devem ser digitadas e concluídas uma por vez;
- não unifica contratos;
- não permite redução para margem positiva;
- atraso depende da análise do saldo pelo banco.

Refin de carteira:

- troco mínimo R$ 100;
- parcela mínima R$ 20;
- tabela normal: 6 pagas;
- margem livre/novo: zero pagas, desde que tenha ao menos 7 dias da averbação;
- margem negativa permitida;
- atraso é descontado da operação.

## 11.10 C6 Bank - julho de 2026

Bloquear quando:

- origem 626 ou 336, pois já pertence ao grupo C6;
- saldo menor que R$ 1.950, porque nem com o troco mínimo de R$ 50 alcança o ticket de R$ 2.000.

Se passar:

- ticket mínimo R$ 2.000;
- troco mínimo R$ 50;
- portabilidade pura ou com refin;
- portabilidade pura usa taxa mínima de 1,75% ao mês;
- refin deve ser efetivado em até 45 dias;
- margem negativa deve ser abatida de uma única parcela;
- não unifica contratos;
- redução no refin não pode ultrapassar 15% da parcela original;
- carência atual de 30 dias;
- parcelas em atraso permitidas com ajuste;
- tabelas de portabilidade e refin devem estar vinculadas e possuir código correspondente.

Refin de carteira:

- troco mínimo de R$ 700 ou 5% do valor financiado;
- 6 pagas nos prazos 84 e 96;
- nos demais prazos, pelo menos 7%;
- não aceita atraso;
- permite unificação e redução;
- redução positiva de até 20%;
- carência de 30, 60 ou 90 dias conforme tabela.

## 11.11 BRB - janeiro de 2026

Bloquear quando:

- espécie 87 ou 88;
- origem 121, 336, 380 ou 626;
- saldo menor que R$ 4.000,01 na análise conservadora;
- contrato com menos de 360 dias;
- saldo maior que R$ 150.000.

Margem negativa:

- marcar revisão;
- exige portabilidade com refin e abatimento na simulação.

Regras gerais adicionais:

- saldo mínimo pode ser R$ 3.000 quando a taxa da operação for 1,85%;
- para demais taxas, R$ 4.000,01;
- troco mínimo R$ 50;
- portabilidade pura não permitida;
- refin é gerado pelo fluxo;
- redução de taxa não permitida quando a portabilidade fica com taxa superior ao refin de forma incompatível;
- não unifica contratos;
- parcelas em atraso não permitidas;
- refin da portabilidade pode ser registrado de 2 a 60 dias após a portabilidade.

Refin de carteira:

- troco mínimo R$ 50;
- mínimo 6 pagas;
- não aceita atraso;
- pode unificar;
- não refinancia determinados contratos cedidos Pine/Facta identificados por regra específica;
- carência de zero a três meses.

## 11.12 Happy - versão V03

Bloquear quando:

- idade menor que 21 anos;
- saldo superior a R$ 85.000.

Revisar quando:

- idade atual mais prazo restante alcançar 79 anos e 11 meses.

Se passar:

- portabilidade pura;
- idade final, saldo e produto atendidos.

## 11.13 Acredto - 24/07/2026

Bloquear quando:

- saldo menor que R$ 4.000 para portabilidade com refin.

Classificação:

- saldo a partir de R$ 6.000: portabilidade pura ou com refin;
- saldo entre R$ 4.000 e R$ 5.999,99: portabilidade com refin;
- margem negativa: revisão, pois o material não definiu tratamento objetivo suficiente.

Regras adicionais:

- troco mínimo no refin: 5% da dívida agregada;
- até 13 contratos em portabilidade múltipla;
- não agrega margem;
- parcelas em atraso podem seguir se incluídas no saldo e informadas corretamente;
- portabilidade e refin nascem juntos;
- se o refin for cancelado, tabela pós pode ficar disponível por cinco dias.

## 11.14 Quero Mais Crédito - julho de 2026

Bloquear quando:

- parcela menor que R$ 20.

Se passar:

- somente portabilidade com refin;
- não possui saldo devedor mínimo;
- troco mínimo de 2% sobre o contrato, limitado a R$ 100;
- margem negativa permitida;
- negativo deve ser abatido em uma parcela;
- não agrega margem;
- não unifica;
- não reduz margem positiva;
- portabilidades devem ser feitas uma por vez;
- parcelas em atraso e exclusividade ainda dependem de confirmação;
- taxa da portabilidade e do refin não podem ser iguais conforme regra apresentada.

Refin de carteira:

- troco mínimo R$ 100;
- parcela mínima R$ 20;
- tabela normal: 6 pagas;
- margem livre/novo: zero pagas, após pelo menos 7 dias da averbação;
- permite unificação;
- margem negativa permitida.

## 11.15 Total Cash - julho de 2026

Bloquear quando:

- espécie 32;
- saldo menor que R$ 3.900, pois saldo mais troco mínimo de R$ 100 não atingem o ticket de R$ 4.000.

Classificação:

- saldo a partir de R$ 4.000: portabilidade pura ou com refin;
- saldo de R$ 3.900 a R$ 3.999,99: somente com refin e troco mínimo.

Regras adicionais:

- ticket mínimo R$ 4.000;
- troco mínimo R$ 100;
- sem parcela mínima;
- portabilidade pura permitida;
- portabilidades simultâneas permitidas;
- não agrega margem;
- não unifica, embora o sistema possa receber até 13 intenções;
- margem negativa permitida;
- negativo abatido automaticamente na parcela do refin;
- não reduz margem positiva;
- atraso não permitido;
- portabilidade e refin nascem juntos;
- espécie 32 está suspensa para portabilidade pura e com refin.

---

# 12. RESTRIÇÕES GEOGRÁFICAS

Normalizar cidade e UF:

- remover acentos;
- converter para maiúsculas;
- comparar cidade/UF.

## Regras aplicadas automaticamente

### Facta

- Piauí: bloqueado para clientes que recebem ou residem no estado.

### Digio

- Orizona/GO: bloqueado;
- Poços de Caldas/MG e idade a partir de 60: formalização híbrida/revisão.

### Finanto

Idade a partir de 60 anos, bloquear em:

- AP;
- PB;
- RR;
- TO.

### iCred

Idade a partir de 60 anos, bloquear em:

- AP;
- PB;
- RS;
- RR;
- SC;
- TO.

### Formalização híbrida para idade a partir de 60 anos

Nos estados AP, PB, RR e TO:

- Banrisul;
- BMG;
- C6;
- Daycoval;
- Digio;
- Facta;
- PAN;
- Quero Mais Crédito;
- Total Cash.

Municípios:

- Daycoval:
  - Itumbiara/GO;
  - Poços de Caldas/MG;
  - Timbiras/MA;
- Digio:
  - Poços de Caldas/MG;
- Quero Mais Crédito:
  - Itumbiara/GO;
  - Poços de Caldas/MG.

Quando a regra for formalização híbrida:

- não classificar como possível automático;
- mudar para revisão;
- explicar que a formalização híbrida é obrigatória.

## Regras geográficas catalogadas para bancos ainda não ativos

Manter disponíveis para futura ativação:

- Amigoz:
  - híbrida acima de 60 em AP, PB, RR, TO e Porto Velho/RO;
  - não atende SC e RS;
- Banco do Brasil:
  - híbrida acima de 60 em AP, PB, RR, TO, Itumbiara/GO, Lavras/MG, Ouro Branco/MG e Poços de Caldas/MG;
- NBC Bank:
  - não atende idade a partir de 60 em AP, PB, RS, RR, SC, TO e Belo Horizonte/MG;
- Presença Bank:
  - híbrida acima de 60 em AP, PB, RR e TO;
  - não atende PI;
- Safra:
  - não atende idade a partir de 60 em AP, GO, PB, RR, TO, Belo Horizonte/MG e Poços de Caldas/MG;
  - não atende clientes do Ceará;
- VCTEX:
  - não atende AP, BA, PB, PI, RS e TO.

---

# 13. PÚBLICO VULNERÁVEL

Fatores possíveis:

- idade;
- renda;
- escolaridade;
- habilidade ou maturidade digital;
- capacidade civil;
- deficiência física ou mental;
- doença grave;
- superendividamento.

Não bloquear automaticamente apenas pela idade. Aplicar a regra específica do banco e da localidade.

Comportamentos catalogados:

- Amigoz: análise interna, sem critérios divulgados;
- Banrisul: sem restrição;
- Banco do Brasil: sem restrição;
- BMG: mostra pop-up, mas não impede digitação;
- BRB: sem restrição;
- C6: sem restrição geral;
- Daycoval: análise da mesa interna;
- Digio: sinaliza CPV e passa por análise interna;
- Facta: sem restrição;
- Finanto: sem restrição;
- iCred: análise interna;
- PAN: alerta e atividade `PEN - Alerta Público Vulnerável`;
- Quero Mais Crédito: análise interna;
- Safra: sem restrição.

Orientar o operador a garantir que o cliente compreendeu a operação. Não instruir o cliente a responder algo falso para passar na análise.

---

# 14. GUIAS OPERACIONAIS NO CHAT

## Banrisul

Resumo:

1. acessar Venda 4.0;
2. selecionar a modalidade;
3. informar contrato e simular;
4. completar agente, cliente e documentos;
5. seguir para formalização;
6. na Portabilidade Especial, o refin ocorre após a averbação;
7. pode haver Portabilidade Múltipla ou Agrupada;
8. cliente não alfabetizado exige informações de rogo.

## C6

Resumo:

1. Cadastro;
2. Proposta Consignado;
3. Portabilidade;
4. informar origem, contrato, parcela, saldo e parcelas a vencer;
5. calcular;
6. escolher tabela;
7. no refin, usar a tabela correspondente à portabilidade;
8. completar cliente, averbação e dados bancários;
9. gravar;
10. portabilidade com refin gera duas propostas.

## Daycoval

Resumo:

1. validar no simulador;
2. abrir Simulação de Ofertas;
3. escolher Port + Refin;
4. informar contrato;
5. usar tabelas combinadas com mesma numeração;
6. completar cliente e banco;
7. gerar propostas.

## iCred

Resumo:

1. Simular INSS;
2. iFlow;
3. informar CPF e telefone;
4. aguardar ofertas automáticas;
5. escolher Port + Refin;
6. selecionar tabela;
7. completar dados pessoais, residência e pagamento;
8. gravar.

Observação:

- telefone não pode estar indevidamente vinculado a outra base do banco;
- aceite automático permite tentativa de tabelas alternativas autorizadas.

## Quero Mais Crédito

Resumo:

1. acessar portal;
2. autenticar com token do aplicativo Correspondente Daycoval;
3. Simulação de Ofertas;
4. cadastrar matrícula;
5. autorizar consulta;
6. escolher Empréstimo Consignado;
7. Port + Refin de Port;
8. informar banco, contrato, parcelas em aberto, parcela e saldo;
9. utilizar tabelas combinadas;
10. completar contatos, cliente, residência, banco e benefício;
11. gerar as duas propostas;
12. enviar formalização.

## Total Cash

Resumo:

1. acessar INSS;
2. Portabilidade Pura ou Portabilidade + Refin;
3. autorizar IN100;
4. informar benefício e margem;
5. informar banco, contrato, saldo, parcela, prazo, atraso e taxa;
6. adicionar um ou mais contratos;
7. completar dados bancários, pessoais e endereço;
8. anexar documento quando necessário;
9. enviar link de assinatura.

Cliente analfabeto ou com mobilidade reduzida:

- documento obrigatório na digitação.

---

# 15. FLUXO GERAL DA PROPOSTA

Etapas que podem aparecer:

- consulta ou autorização IN100;
- digitação;
- formalização;
- auditoria;
- análise interna;
- CIP;
- token ou segunda assinatura;
- pagamento do saldo ao banco de origem;
- averbação da portabilidade;
- desaverbação do contrato anterior, quando aplicável;
- averbação do refinanciamento;
- anuência;
- análise de conformidade;
- pagamento ao cliente.

Não afirmar que a ordem é idêntica em todos os bancos. A ordem varia por banco, produto e proposta.

---

# 16. COMPORTAMENTO DO CHAT

O chat deve:

- permanecer no assunto de consignado;
- responder de forma curta;
- usar os dados do extrato quando houver análise;
- citar o motivo da decisão;
- não inventar aprovação;
- distinguir portabilidade pura, portabilidade com refin e refin de carteira;
- explicar regras gerais quando não houver extrato;
- responder por banco quando o banco for citado;
- priorizar o caso analisado quando houver arquivo carregado.

Respostas esperadas:

## Onde operar

Para um contrato:

> Para a parcela de R$ X do banco Y, encontrei N rotas possíveis: A, B e C. Consulte a comparação completa para ver bloqueios e motivos.

Para vários:

> Analisei N contratos e X possuem pelo menos uma rota possível.

## Espécie

Informar:

- código;
- classificação geral;
- motivo;
- aviso de que o banco pode ter restrição própria.

## Taxa

Informar que foi recalculada com:

- quitação;
- parcela;
- prazo restante.

## Bancos cadastrados

Listar os 15 bancos ativos.

## Margem negativa

Explicar:

- não dividir o negativo;
- tratar em uma parcela;
- regras variam por banco.

## Taxa-teto

- 1,85% empréstimo;
- 2,46% cartões.

## Prazo máximo

- até 108 parcelas;
- depende da política do banco.

## Quantidade de contratos

- até 13 empréstimos;
- até 2 cartões;
- BPC/LOAS: um cartão.

## Público vulnerável

Explicar fatores e análise interna sem ensinar a contornar validações.

---

# 17. INTERFACE

A aplicação deve possuir:

- barra lateral;
- botão “Novo atendimento”;
- área “Atendimento”;
- área “Roteiros”;
- área “Calculadora”;
- lista de atendimentos recentes;
- cabeçalho `INSS · Portabilidade`;
- botão “Anexar extrato”;
- cartão de upload com arrastar e soltar;
- estado vazio explicando:
  1. extrair;
  2. calcular;
  3. comparar;
- análise automática;
- painel de contexto;
- chat;
- base de roteiros;
- atualização de roteiro em PDF.
- calculadora interna de financiamento com prestações fixas;
- link para a Calculadora do Cidadão oficial do Banco Central.

Após a análise, mostrar:

- cliente;
- benefício mascarado;
- CPF mascarado;
- espécie e status;
- idade;
- nascimento;
- cidade e UF;
- margem;
- banco pagador;
- quantidade de contratos;
- quantidade de possibilidades;
- quantidade de roteiros consultados.

Para cada contrato:

- banco de origem;
- número do contrato;
- parcela;
- quitação;
- prazo pago/original;
- parcelas restantes;
- taxa calculada;
- taxa do extrato;
- destinos possíveis;
- modalidade;
- motivo;
- comparação completa;
- possíveis;
- revisar;
- bloqueados.

Usar mensagens visuais diferentes para:

- possível;
- revisar;
- bloqueado;
- espécie consignável;
- espécie não consignável;
- espécie desconhecida;
- erro de leitura.

O sistema deve ser responsivo para desktop e celular.

---

# 18. ATUALIZAÇÃO DE ROTEIROS

Cada regra precisa manter:

- banco;
- convênio;
- produto;
- modalidade;
- versão;
- data de atualização;
- fonte;
- critérios;
- exceções;
- status ativo ou catalogado;
- histórico.

Fluxo ideal de atualização:

1. receber novo PDF;
2. extrair texto;
3. identificar banco, convênio, produto e versão;
4. comparar com versão anterior;
5. destacar mudanças;
6. converter regras objetivas em estrutura;
7. submeter a revisão humana;
8. executar testes;
9. publicar;
10. manter a versão anterior no histórico.

Uma regra nova não deve entrar automaticamente em produção sem revisão.

Não misturar:

- INSS com SIAPE;
- portabilidade com refin de carteira;
- banco de origem com banco de destino;
- regra de digitação com regra de elegibilidade;
- guia operacional com aprovação automática.

---

# 19. PRIVACIDADE E SEGURANÇA

- Não versionar extratos reais.
- Não versionar CPF, benefício, telefone, endereço ou número de contrato reais.
- Não usar nomes reais em fixtures.
- Usar dados totalmente fictícios nos testes.
- Mascarar CPF e benefício na interface.
- Não enviar PDF do cliente para terceiros sem autorização.
- Preferir processamento local.
- Não registrar conteúdo sensível em logs.
- Não exibir tokens, credenciais ou segredos.
- Nunca colocar os tokens válidos ou o segredo da sessão no código, no GitHub,
  no HTML ou no JavaScript enviado ao navegador.
- Guardar somente hashes SHA-256 dos tokens nas variáveis protegidas da
  hospedagem.
- Validar tokens e sessões no servidor.
- Usar cookie de sessão `HttpOnly`, `SameSite=Strict` e `Secure` em produção.
- Limitar tentativas repetidas de autenticação.
- Permitir encerramento explícito da sessão.
- PDFs dos roteiros podem ser resumidos em regras estruturadas; não é necessário publicar os arquivos originais no GitHub.
- O endereço pode ser público porque esta mudança foi autorizada pelo usuário,
  desde que a barreira de token esteja funcionando antes da abertura do acesso.

---

# 20. ARQUITETURA TÉCNICA ATUAL

Tecnologias:

- React 19;
- Next.js 16;
- vinext;
- Vite;
- TypeScript;
- `pdfjs-dist`;
- Cloudflare/Sites;
- Node.js 22 ou superior;
- Git/GitHub.

Arquivos principais:

- `app/page.tsx`: interface, upload, chat, calculadora e guias;
- `app/globals.css`: design responsivo;
- `lib/inss-extrato.mjs`: parser, taxa e motor de regras;
- `lib/citizen-calculator.mjs`: cálculos de financiamento com prestações fixas;
- `lib/token-auth.mjs`: validação dos tokens e assinatura da sessão;
- `worker/index.ts`: barreira de acesso antes da aplicação;
- `scripts/generate-access-tokens.mjs`: geração e rotação da lista de tokens;
- `tests/inss-parser.test.mjs`: testes do parser e decisões;
- `tests/citizen-calculator.test.mjs`: testes dos quatro cálculos da calculadora;
- `tests/token-auth.test.mjs`: testes de token, sessão e cookies;
- `tests/rendered-html.test.mjs`: teste de renderização e privacidade;
- `types/pdf-worker.d.ts`: declaração do worker PDF;
- `.openai/hosting.json`: vínculo da hospedagem.

O PDF.js deve usar worker empacotado e importado por URL.

Não colocar regras críticas somente em textos de interface. Manter um motor central, testável e versionável.

---

# 21. TESTES OBRIGATÓRIOS

Manter e ampliar testes para:

- extração dos dados estruturados;
- cidade e UF;
- contratos;
- cálculo de taxa;
- cálculo de meses, taxa, prestação e valor financiado;
- validação de exatamente um campo vazio na calculadora;
- bloqueio de visitantes sem sessão;
- aceitação de token válido;
- rejeição de token inválido;
- rejeição de sessão adulterada ou expirada;
- comparação com 15 bancos;
- espécie consignável;
- espécie não consignável;
- espécie desconhecida;
- restrições de UF;
- restrições municipais;
- formalização híbrida;
- Total Cash bloqueado para espécie 32;
- limites gerais do INSS;
- renderização da interface;
- presença dos 15 bancos;
- ausência de dados reais;
- ausência dos PDFs reais no código;
- correção `loadingTask.destroy()`;
- proibição de `pdf.destroy()`.

Comando esperado:

```bash
npm test
```

O teste deve executar o build e a suíte automatizada.

Antes de publicar:

1. build aprovado;
2. testes aprovados;
3. `git diff --check`;
4. busca por dados reais;
5. commit;
6. push para `main`;
7. publicação da mesma revisão;
8. confirmar URL de produção.

---

# 22. CRITÉRIOS DE ACEITAÇÃO

O trabalho só está concluído quando:

- o operador consegue anexar um extrato digital;
- a aplicação não exige uma pergunta para começar;
- o PDF é lido sem erro;
- contratos são identificados;
- a taxa é recalculada;
- os 15 bancos são comparados;
- espécie é validada;
- localização é considerada;
- cada banco recebe status e motivo;
- bloqueios são explicados;
- o chat responde sobre o caso;
- nenhuma regra desconhecida vira aprovação;
- nenhum dado real entra no repositório;
- testes passam;
- GitHub está atualizado;
- site está publicado.

---

# 23. LIMITAÇÕES CONHECIDAS E PRÓXIMOS PASSOS

## Limitações atuais

- PDFs escaneados precisam de OCR;
- regras comerciais podem mudar;
- tabelas do dia não estão integradas automaticamente;
- CIP e Dataprev não estão integradas em tempo real;
- refinanciamento de carteira ainda é principalmente conhecimento de chat, não uma segunda classificação completa por contrato;
- atualização de PDF ainda precisa de revisão e transformação das regras;
- o chat atual é orientado por intenções e regras estruturadas, não por um modelo generativo com busca vetorial.

## Próximas evoluções desejadas

- OCR para extrato escaneado;
- banco de dados de regras;
- histórico e comparação de versões;
- painel de aprovação de mudanças;
- RAG apenas para explicações, mantendo decisões objetivas em regras;
- segunda análise para refinanciamento de carteira;
- cálculo de troco estimado;
- integração com tabelas comerciais;
- autenticação por operador;
- auditoria de decisões;
- exportação de relatório;
- novos convênios separados;
- testes com diferentes layouts de extrato;
- cadastro controlado de novos bancos.

---

# 24. DOCUMENTOS QUE FORMARAM A BASE

Foram utilizados ou catalogados documentos com os seguintes temas e nomes:

## Roteiros iniciais

- `ROTEIROINSSEMPRESTIMO.pdf`
- `ROSIAPEFACTA.pdf`
- `ROINSS(1) (1).pdf`
- `RoteiroOperacional_INSS(1581)_EmprestimoBMG_19-05-2026.pdf`
- `RO - INSS - EMPRESTIMO.pdf`
- `ROPANINSS-EMPRESTIMO18-05-2026.pdf`

O arquivo de caso real foi removido da aplicação e não deve ser usado.

## Roteiros adicionais

- `INSS - ICRED - EMPRÉSTIMO.pdf`
- `INSS - FINANTO - EMPRESTIMO - ROTEIRO OPERACIONAL.pdf`
- `INSS - DIGIO - EMPRÉSTIMO - ROTEIRO OPERACIONAL.pdf`
- `INSS - DAYCOVAL - EMPRÉSTIMO.pdf`
- `INSS - C6 BANK - EMPRÉSTIMO - ROTEIRO OPERACIONAL.pdf.pdf`
- `INSS - BRB - EMPRÉSTIMO - ROTEIRO.pdf`
- `happy inss.pdf`

## Materiais gerais e operacionais

- `Como Funcionam as Taxas, Margens e os Limites de Contratos de Empréstimos e Cartões Consignados - INSS.pdf`
- `TOTAL CASH - Portabilidade com Refinanciamento da Portabilidade - Simulação e Digitação - INSS.pdf`
- `TOTAL CASH - Portabilidade Pura - Simulação e Digitação - INSS.pdf`
- `QUERO MAIS CRÉDITO - Portabilidade com Refinanciamento da Portabilidade - Simulação e Digitação - INSS.pdf`
- `ICRED - Portabilidade com Refinanciamento da Portabilidade - Simulação e Digitação - INSS.pdf`
- `ICRED - Refinanciamento de Retenção - Simulação e Digitação - INSS.pdf`
- `DAYCOVAL - Portabilidade com Refinanciamento da Portabilidade - Simulação e Digitação - INSS.pdf`
- `C6 BANK - Refinanciamento da Portabilidade - Simulação e Digitação - INSS.pdf`
- `C6 BANK - Portabilidade com Refinanciamento da Portabilidade - Simulação e Digitação - INSS.pdf`
- `C6 BANK - Portabilidade Pura - Simulação e Digitação - INSS.pdf`
- `BANRISUL - Portabilidade com Refinanciamento da Portabilidade - Simulação e Digitação - INSS.pdf`
- `BANRISUL - Portabilidade Pura - Simulação e Digitação - INSS.pdf`
- `Como Utilizar a Calculadora do Cidadão - INSS.pdf`
- `Regras Gerais - Refinanciamento de Carteira - INSS.pdf`
- `Regras para Público Vulnerável - INSS.pdf`
- `Regras Gerais - Portabilidade e Refinanciamento de Portabilidade - INSS.pdf`
- `Estados e Municípios que possuem Restrição para Contratação - INSS.pdf`
- `Fluxo da Proposta - INSS.pdf`

Também foi fornecida uma lista oficial de espécies consignáveis e não consignáveis.

---

# 25. INSTRUÇÃO FINAL PARA A NOVA IA

Ao receber este prompt:

1. trate-o como especificação funcional e operacional do projeto;
2. preserve tudo o que já funciona;
3. não remova regras sem evidência;
4. não misture convênios;
5. não use dados reais;
6. implemente pedidos novos diretamente quando houver acesso ao código;
7. valide com testes;
8. explique claramente o que mudou;
9. mantenha o GitHub atualizado quando solicitado;
10. publique o site quando a alteração for destinada ao ambiente em uso;
11. sempre informe que o resultado é pré-análise;
12. priorize precisão e rastreabilidade sobre quantidade de respostas;
13. quando faltar uma regra, marque **Revisar**;
14. quando um PDF novo contradizer outro, não escolha silenciosamente: compare versão, escopo e especificidade;
15. nunca exponha dados pessoais, credenciais ou informações internas sensíveis.

O resultado esperado é uma ferramenta operacional confiável, automática, simples para o operador e auditável para a empresa.

---
