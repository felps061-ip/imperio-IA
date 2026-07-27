# Conector C6 · Império IA

O conector automatiza somente a **simulação de refinanciamento de carteira INSS**. Ele não grava proposta e não conclui contratação.

## Instalação no Chrome

1. Extraia o arquivo `conector-c6-imperio.zip`.
2. No Chrome, abra `chrome://extensions`.
3. Ative o **Modo do desenvolvedor**.
4. Clique em **Carregar sem compactação** e selecione a pasta extraída.
5. Abra os detalhes da extensão e clique em **Opções da extensão**.
6. Salve o usuário e a senha do C6. Os dados ficam somente nesse computador.

Depois disso, abra o Império IA, entre em **Simulações > C6** e informe o CPF.

## Permissão necessária

O perfil do C6 precisa exibir **Cadastro > Proposta Consignado**. Se esse menu não aparecer, o correspondente ou administrador do C6 deve liberar a função para o usuário.

## Segurança

- Nenhuma credencial está incluída no código ou no GitHub.
- A senha fica no armazenamento local da extensão.
- O site envia ao conector apenas o CPF digitado.
- O conector encerra a automação após devolver as condições.
