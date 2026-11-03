export default function PoliticaPrivacidadePage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-[#177a56] mb-4">Política de Privacidade</h1>

        <p className="text-[#4a5568] mb-4">
          A sua privacidade é importante para nós. Esta Política de Privacidade descreve como
          coletamos, usamos e protegemos as suas informações quando você usa o Ordexa.
        </p>

        <h2 className="text-xl font-semibold text-[#177a56] mt-6">1. Informações que Coletamos</h2>
        <ul className="list-disc list-inside text-[#4a5568] mb-4">
          <li>
            <strong>Informações de conta:</strong> Nome, e-mail, senha e papel da plataforma
            (USER ou PLATFORM_ADMIN), fornecidas durante o registro.
          </li>
          <li>
            <strong>Informações da empresa:</strong> Nome da empresa, slug, descrição, contato,
            e outros dados opcionais fornecidos no painel de controle.
          </li>
          <li>
            <strong>Dados de uso:</strong> Informações sobre como você acessa e usa o serviço,
            incluindo endereço IP, tipo de navegador, páginas visitadas e horário de acesso.
          </li>
          <li>
            <strong>Cookies e tecnologias similares:</strong> Usamos cookies para melhorar a
            sua experiência, analisar tendências, administrar o serviço e coletar informações
            demográficas. Você pode configurar o seu navegador para recusar cookies ou alertá-
            lo quando os cookies estão sendo enviados.
          </li>
        </ul>

        <h2 className="text-xl font-semibold text-[#177a56] mt-6">2. Como Usamos Suas Informações</h2>
        <p className="text-[#4a5568] mb-4">
          Usamos as informações que coletamos para: (i) operar e manter o serviço; (ii) criar
          e gerenciar a sua conta; (iii) processar pedidos e pagamentos; (iv) fornecer suporte
 ao cliente; (v) enviar comunicações administrativas e de segurança; e (vi) melhorar o
          serviço.
        </p>

        <h2 className="text-xl font-semibold text-[#177a56] mt-6">3. Divulgação de Informações</h2>
        <p className="text-[#4a5568] mb-4">
          Não vendemos, alugamos ou comercializamos as suas informações pessoais a terceiros.
          Podemos compartilhar suas informações nas seguintes situações:
        </p>
        <ul className="list-disc list-inside text-[#4a5568] mb-4">
          <li>Com provedores de serviço que nos ajudam a operar o serviço, sujeitos a
            acordos de confidencialidade.</li>
          <li>Quando exigido por lei ou em resposta a solicitações governamentais válidas.</li>
          <li>Para proteger os direitos, propriedade ou segurança do Ordexa, nossos usuários
            ou o público.</li>
          <li>No contexto de uma fusão, aquisição ou venda de ativos, onde as informações
            pessoais podem ser transferidas como parte dos ativos transferidos.</li>
        </ul>

        <h2 className="text-xl font-semibold text-[#177a56] mt-6">4. Segurança das Informações</h2>
        <p className="text-[#4a5568] mb-4">
          Implementamos medidas de segurança apropriadas para proteger suas informações
          pessoais contra acesso não autorizado, alteração, divulgação ou destruição. No
          entanto, nenhuma transmissão de dados pela internet ou armazenamento eletrônico pode
          ser garantido como 100% seguro.
        </p>

        <h2 className="text-xl font-semibold text-[#177a56] mt-6">5. Retenção de Dados</h2>
        <p className="text-[#4a5568] mb-4">
          Retemos seus dados pessoais pelo tempo necessário para cumprir as finalidades
          descritas nesta Política de Privacidade, a menos que exigido por lei ou com base
          em interesses legítimos de negócios.
        </p>

        <h2 className="text-xl font-semibold text-[#177a56] mt-6">6. Seus Direitos</h2>
        <p className="text-[#4a5568] mb-4">
          Dependendo da sua localização, você pode ter direitos relacionados aos seus dados
          pessoais, incluindo o direito de: (i) acessar e obter uma cópia dos seus dados;
          (ii) retificar ou corrigir imprecisões; (iii) solicitar a exclusão dos seus dados;
          (iv) restringir o processamento; (v) se opor ao processamento; e (vi) portar
          seus dados em um formato estruturado e legível por máquina.
        </p>

        <div className="mt-8 p-4 bg-gray-100 rounded">
          <p className="text-sm text-[#6b7280]">
            Última atualização: 02 de novembro de 2026
          </p>
        </div>
      </div>
    </main>
  );
}