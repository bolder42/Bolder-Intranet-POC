# Guidelines de desenvolvimento
Esse arquivo descreve boas práticas a serem seguidas no desenvolvimento desse projeto. Podemos adicionar mais regras aqui caso seja necessário no decorrer do desenvolvimento. Esse documento é para ser lido por nós, desenvolvedores, e os agentes de I.A não irão leva-lo em consideração.

1. Antes de implementar uma nova feature, sempre peça primeiro para que o agente DESCREVA seu plano de como implementa-la. Você precisa ter certeza
do que o agente vai implementar antes que ele o faça. Dessa maneira, você se certifica de que o agente entendeu o que você pediu e vai implementar de acordo
com o que é esperado.

2. Sempre teste o código, principalmente antes de fazer PR. Isso já está descrito no AGENTS.md, o que significa que o agente deve fazer isso por conta própria,
mas caso não faça, você deve se certificar de que foram criados testes para se certificar de que sua implementação não está quebrada e de que ela não quebra 
nada do que já foi feito anteriormente no projeto.

3. Sempre faça uma branch separada da main para trabalhar. A única forma de mudar o código da main DEVE ser através de PRs. Jamais faça merge de algo na main por conta própria, a não ser que seja documentação, ou coisas sem risco. Use o bom senso.

4. É esperado que você verifique as PRs abertas no repositório de tempos em tempos. Se dê o trabalho de revisar a PR dos outros integrantes do time e aprova-las ou não. Se todos derem uma olhada nas PRs de vez em quando, não fica pesado para ninguém.

5. Mantenham a documentação (.md) sempre atualizada. Isso também já está descrito no AGENTS.md, mas certifiquem-se de que os arquivos .md realmente estão sendo atualizados de acordo. Arquivos como o AGENTS.md e MODULES.md são a memória persistente do nosso projeto. Se algo nesses arquivos sair de sincronia, ficar stale, os agentes sairão de sincronia e teremos problemas.
