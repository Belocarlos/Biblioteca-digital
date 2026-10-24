-- Migração 0004: dados institucionais de referência.
-- Não inclui recursos, autores, sessões ou estatísticas fictícias.

insert into public.collections (slug, name, description, position) values
  ('ambiente-e-sustentabilidade', 'Ambiente e Sustentabilidade',
   'Materiais sobre conservação dos ecossistemas, gestão de recursos naturais e práticas de desenvolvimento sustentável.', 1),
  ('mudancas-climaticas', 'Mudanças Climáticas',
   'Estudos e recursos sobre as causas, os impactos e as respostas às alterações climáticas, incluindo adaptação, mitigação e justiça climática.', 2),
  ('educacao-e-conhecimento', 'Educação e Conhecimento',
   'Recursos sobre práticas pedagógicas, educação ao longo da vida, educação socioambiental e partilha de conhecimento.', 3),
  ('investigacao-cientifica', 'Investigação Científica',
   'Publicações sobre metodologias de investigação, ética científica, comunicação de ciência e resultados de investigação.', 4),
  ('cultura-arte-e-sociedade', 'Cultura, Arte e Sociedade',
   'Materiais sobre expressões culturais e artísticas, património, identidade e transformações sociais.', 5),
  ('politicas-publicas', 'Políticas Públicas',
   'Análises, relatórios e documentos sobre a conceção, a implementação e a avaliação de políticas públicas.', 6),
  ('tecnologia-e-inovacao', 'Tecnologia e Inovação',
   'Recursos sobre tecnologias digitais, inovação científica e social e o respetivo impacto na sociedade.', 7),
  ('cooperacao-internacional-e-cplp', 'Cooperação Internacional e CPLP',
   'Materiais sobre cooperação entre países e instituições, com particular atenção à Comunidade dos Países de Língua Portuguesa.', 8),
  ('desenvolvimento-comunitario', 'Desenvolvimento Comunitário',
   'Recursos sobre participação cidadã, desenvolvimento local e iniciativas de base comunitária.', 9);

insert into public.site_settings (key, value) values
  ('contact_email', '"openlecture4all@gmail.com"'::jsonb),
  ('social_links', '[]'::jsonb),
  ('og_image_key', 'null'::jsonb),
  ('home_about', to_jsonb($t$O Open Lecture4All é um programa internacional dedicado à democratização do conhecimento, à divulgação científica, à educação, à sustentabilidade e à cooperação entre investigadores, docentes, profissionais, estudantes e comunidades. A Biblioteca Digital reúne as publicações, apresentações, gravações e materiais complementares associados às atividades do programa, em particular às sessões Saberes em Rede.$t$::text)),
  ('about_md', to_jsonb($md$## O que é o Open Lecture4All

O Open Lecture4All é um programa internacional dedicado à democratização do conhecimento, à divulgação científica, à educação, à sustentabilidade e à cooperação entre investigadores, docentes, profissionais, estudantes e comunidades.

Através das sessões **Saberes em Rede**, o programa promove o diálogo interdisciplinar e a partilha de experiências académicas e profissionais.

## Missão e objetivos

A missão do programa é tornar o conhecimento acessível a todas as pessoas, independentemente do país, da instituição ou da área de formação. Constituem objetivos do programa:

- divulgar conhecimento científico e académico em linguagem acessível;
- promover o diálogo entre áreas do saber e entre diferentes contextos geográficos;
- valorizar a educação, a sustentabilidade e a cooperação internacional;
- preservar e disponibilizar os materiais produzidos no âmbito das suas atividades.

## Origem e propósito da biblioteca

A Biblioteca Digital é uma extensão das atividades do Open Lecture4All. Reúne publicações, livros, artigos científicos, apresentações, gravações de sessões e materiais complementares, com o objetivo de consultar, pesquisar, organizar, preservar e partilhar conhecimento de forma acessível e estruturada.

Os materiais são publicados após validação editorial e de acordo com a licença ou a autorização concedida pelos respetivos titulares de direitos.

## Público-alvo

A biblioteca destina-se a estudantes, investigadores, professores, profissionais, organizações, instituições e a todas as pessoas interessadas na aprendizagem contínua.

## Áreas de atuação

- Ambiente e sustentabilidade
- Mudanças climáticas
- Educação e conhecimento
- Investigação científica
- Cultura, arte e sociedade
- Políticas públicas
- Tecnologia e inovação
- Cooperação internacional e CPLP
- Desenvolvimento comunitário$md$::text));

insert into public.legal_documents (slug, title, body_md) values
('politica-de-privacidade', 'Política de Privacidade', $md$> Versão preliminar preparada para revisão jurídica e aprovação institucional. O conteúdo deve ser confirmado antes da publicação definitiva da plataforma.

## 1. Responsável pelo tratamento

O responsável pelo tratamento dos dados pessoais recolhidos através da Biblioteca Digital Open Lecture4All é o programa Open Lecture4All.

Contacto para questões de privacidade: [openlecture4all@gmail.com](mailto:openlecture4all@gmail.com).

A identificação jurídica completa da entidade responsável (denominação, sede e número de identificação) será acrescentada após confirmação institucional.

## 2. Âmbito

Esta política aplica-se ao website da Biblioteca Digital Open Lecture4All, incluindo a consulta pública do acervo, o formulário de submissão de materiais e a área administrativa reservada à equipa editorial.

## 3. Dados pessoais recolhidos

**Consulta pública.** A consulta da biblioteca não exige registo. Não são recolhidos dados de identificação dos visitantes. A plataforma regista contagens agregadas e anónimas de visualizações, leituras online e descarregamentos de cada recurso, sem associação a qualquer pessoa, endereço IP ou dispositivo.

**Submissão de materiais.** Quando propõe um material, são recolhidos: nome completo, endereço de e-mail, instituição, país, dados bibliográficos do material, o ficheiro ou a ligação enviada, as informações sobre licença e direitos de autor e as declarações de autorização prestadas.

**Perfis de autores e oradores.** Os perfis públicos podem incluir nome, área de especialização, país, instituição, biografia, fotografia e ligações profissionais. Estes dados são publicados apenas com autorização da pessoa em causa. As fotografias só são apresentadas quando a autorização de utilização tiver sido registada.

**Equipa editorial.** Para as contas da área administrativa são tratados o nome, o endereço de e-mail, a função atribuída, a palavra-passe (armazenada apenas sob a forma de resumo criptográfico Argon2id), as datas de acesso e o registo das ações administrativas realizadas.

**Segurança.** Para limitar tentativas abusivas de autenticação e de submissão, a plataforma calcula um resumo criptográfico do endereço IP. O endereço IP não é guardado em claro.

## 4. Finalidades do tratamento

- Disponibilizar e preservar o acervo da biblioteca.
- Receber, avaliar e responder às propostas de materiais.
- Publicar os perfis de autores e oradores autorizados.
- Gerir o acesso da equipa editorial e registar as ações administrativas.
- Proteger a plataforma contra utilizações abusivas.
- Produzir estatísticas agregadas de utilização do acervo.

## 5. Fundamentos jurídicos

Nos termos do Regulamento Geral sobre a Proteção de Dados (RGPD, Regulamento (UE) 2016/679) e da Lei Geral de Proteção de Dados Pessoais do Brasil (LGPD, Lei n.º 13.709/2018), os tratamentos descritos baseiam-se em:

- diligências solicitadas pelo titular, no caso das submissões de materiais;
- consentimento, no caso da publicação de perfis, fotografias e dados de autores e oradores;
- interesse legítimo na segurança da plataforma e na gestão da equipa editorial;
- cumprimento de obrigações legais, quando aplicável.

Serão consideradas as demais normas de proteção de dados aplicáveis nos países em que a plataforma opera.

## 6. Armazenamento e proteção

Os dados são armazenados numa base de dados PostgreSQL e num serviço de armazenamento de ficheiros associado à plataforma. Encontram-se implementadas as seguintes medidas:

- comunicação cifrada por HTTPS no ambiente publicado;
- palavras-passe guardadas exclusivamente sob a forma de resumo Argon2id;
- sessões administrativas com cookie protegido e prazo de validade;
- controlo de acesso por função, aplicado no servidor e na base de dados;
- limitação de tentativas de autenticação e de submissão;
- registo de ações administrativas relevantes;
- acesso aos ficheiros submetidos reservado à equipa editorial.

A localização dos servidores será indicada nesta política após a escolha definitiva do fornecedor de alojamento.

## 7. Partilha de dados

Os dados pessoais não são vendidos nem cedidos para fins comerciais. Podem ser tratados por fornecedores de alojamento e armazenamento que prestam serviços técnicos à plataforma, nos termos de contrato. A lista de subcontratantes será publicada após a escolha definitiva dos fornecedores.

As páginas de sessões podem incluir gravações alojadas em plataformas de vídeo externas. Esses conteúdos só são carregados depois de o visitante o solicitar expressamente, momento a partir do qual se aplica a política de privacidade da plataforma em causa.

## 8. Prazos de conservação

- Submissões aceites: enquanto o material permanecer na biblioteca.
- Submissões rejeitadas: até 12 meses após a decisão.
- Registos de tentativas de autenticação: até 90 dias.
- Registos de limitação de pedidos: até 2 dias.
- Sessões administrativas: até ao fim da validade ou ao encerramento da sessão.
- Contas da equipa editorial: enquanto a pessoa integrar a equipa.

## 9. Direitos dos titulares

O titular dos dados pode solicitar o acesso, a retificação, o apagamento, a limitação do tratamento, a portabilidade e a oposição ao tratamento dos seus dados, bem como retirar o consentimento a qualquer momento, sem comprometer a licitude do tratamento efetuado anteriormente.

Tem ainda o direito de apresentar reclamação junto da autoridade de controlo competente, nomeadamente a Comissão Nacional de Proteção de Dados (CNPD), em Portugal, ou a Autoridade Nacional de Proteção de Dados (ANPD), no Brasil.

## 10. Como exercer os direitos

Os pedidos de acesso, correção ou eliminação devem ser enviados para [openlecture4all@gmail.com](mailto:openlecture4all@gmail.com), com a indicação do pedido e dos dados necessários à identificação do titular. A resposta será prestada no prazo legal aplicável.

## 11. Cookies

A área pública da biblioteca não utiliza cookies de análise, publicidade ou rastreamento. A área administrativa utiliza um único cookie estritamente necessário (`ol4_session`), que mantém a sessão autenticada da equipa editorial e expira automaticamente.

Os tipos de letra são servidos pela própria plataforma, sem pedidos a serviços externos.

## 12. Alterações

Esta política pode ser atualizada. A data e a versão da última alteração são indicadas nesta página.

## 13. Contacto

Para qualquer questão relacionada com privacidade e proteção de dados: [openlecture4all@gmail.com](mailto:openlecture4all@gmail.com).$md$),
('termos-e-condicoes', 'Termos e Condições', $md$> Versão preliminar preparada para revisão jurídica e aprovação institucional. O conteúdo deve ser confirmado antes da publicação definitiva da plataforma.

## 1. Identificação da plataforma

A Biblioteca Digital Open Lecture4All é um repositório digital do programa internacional Open Lecture4All. Contacto institucional: [openlecture4all@gmail.com](mailto:openlecture4all@gmail.com).

## 2. Finalidade da biblioteca

A biblioteca tem por finalidade reunir, organizar, preservar e disponibilizar publicações, livros, artigos científicos, apresentações, gravações de sessões e materiais complementares associados às atividades do Open Lecture4All.

## 3. Condições de acesso

A consulta dos recursos públicos é gratuita e não exige registo. O acesso à área administrativa é reservado às pessoas autorizadas pela equipa responsável.

Alguns recursos apresentam apenas a descrição bibliográfica e a ligação para a fonte original, quando o ficheiro não pode ser alojado na plataforma.

## 4. Utilização permitida dos materiais

Cada recurso indica a licença ou as condições de utilização aplicáveis. A leitura online e o descarregamento só são disponibilizados quando a licença ou a autorização do titular o permitem.

O utilizador compromete-se a respeitar a licença de cada recurso, a citar corretamente as obras utilizadas e a não utilizar os materiais para fins contrários à lei.

## 5. Direitos de autor

Os direitos de autor e direitos conexos sobre os materiais pertencem aos respetivos titulares. A disponibilização de um material na biblioteca não implica a transmissão desses direitos.

Os documentos não são disponibilizados para descarregamento sem autorização ou licença adequada.

## 6. Responsabilidade dos utilizadores

O utilizador é responsável pela utilização que faz dos materiais consultados e pela veracidade das informações que submete através da plataforma.

## 7. Regras de submissão

Ao submeter um material, a pessoa proponente declara que:

- é titular dos direitos sobre o material ou dispõe de autorização para o disponibilizar;
- as informações sobre autoria, licença e direitos são verdadeiras;
- o material não viola direitos de terceiros nem a lei aplicável.

As submissões não são publicadas automaticamente. Todos os materiais são avaliados pela equipa editorial, que pode aceitar, solicitar alterações ou recusar a proposta. A aceitação de uma submissão não obriga à sua publicação imediata.

São aceites ficheiros em formato PDF até ao limite indicado no formulário. Os ficheiros com conteúdo ativo, como JavaScript, são recusados.

## 8. Denúncia de conteúdos

Quem considerar que um conteúdo viola direitos de autor, direitos de personalidade ou a lei pode apresentar uma denúncia para [openlecture4all@gmail.com](mailto:openlecture4all@gmail.com), indicando:

- o endereço da página do recurso;
- a identificação de quem apresenta a denúncia;
- a descrição fundamentada da situação.

Cada página de recurso inclui uma ligação para denúncia. A equipa analisa as denúncias recebidas e pode suspender o acesso ao conteúdo durante a análise.

## 9. Limitações de responsabilidade

A equipa procura garantir a exatidão dos metadados e a disponibilidade da plataforma, mas não garante a ausência de erros ou interrupções. O conteúdo dos materiais é da responsabilidade dos respetivos autores. As ligações para websites externos são fornecidas por conveniência, sem responsabilidade pelo respetivo conteúdo.

## 10. Atualizações dos termos

Estes termos podem ser atualizados. A data e a versão da última alteração são indicadas nesta página. A utilização da plataforma após a atualização implica a aceitação da nova versão.

## 11. Contacto institucional

[openlecture4all@gmail.com](mailto:openlecture4all@gmail.com)$md$);
