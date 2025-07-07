import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, CheckCircle, Globe, Zap, Shield, Code } from "lucide-react";
import { useState } from "react";

export default function WebhookIntegration() {
  const [copied, setCopied] = useState<string | null>(null);
  
  const webhookUrl = `${window.location.origin}/conversion`;
  
  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const webhookExamples = [
    {
      platform: "Hotmart",
      fields: ["SCK", "SRC"],
      example: {
        SCK: "mc_automatikblog-main_1751843549158",
        event: "PURCHASE_COMPLETED",
        product: "Curso Digital Avançado",
        purchase_value: 297.00,
        currency: "BRL",
        buyer_email: "cliente@email.com"
      }
    },
    {
      platform: "Checkout Próprio",
      fields: ["SRC", "SCK"],
      example: {
        SRC: "mc_automatikblog-main_1751843549158",
        order_total: 497.00,
        order_currency: "BRL",
        event_type: "purchase",
        customer_email: "comprador@email.com"
      }
    },
    {
      platform: "Genérico",
      fields: ["session_id", "click_id"],
      example: {
        session_id: "mc_automatikblog-main_1751843549158",
        amount: 199.99,
        currency: "BRL",
        conversion_type: "purchase"
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Zap className="h-5 w-5 text-blue-600" />
        <h1 className="text-2xl font-bold">Integração Webhook</h1>
        <Badge variant="outline">Conversões Externas</Badge>
      </div>

      {/* URL do Webhook */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            URL do Webhook
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                value={webhookUrl}
                readOnly
                className="font-mono bg-gray-50"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(webhookUrl, 'url')}
              >
                {copied === 'url' ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Método:</strong> POST | <strong>Content-Type:</strong> application/json
                <br />
                Este endpoint aceita webhooks de qualquer plataforma que envie dados JSON.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Configuração por Plataforma */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        {webhookExamples.map((config, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="text-lg">{config.platform}</CardTitle>
              <div className="flex gap-2">
                {config.fields.map((field) => (
                  <Badge key={field} variant="secondary">{field}</Badge>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-gray-600 font-medium">
                  Exemplo de Payload:
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(config.example, null, 2)}
                  </pre>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => copyToClipboard(JSON.stringify(config.example, null, 2), config.platform)}
                >
                  {copied === config.platform ? (
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  Copiar Exemplo
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Instruções de Configuração */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Como Configurar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Hotmart */}
            <div>
              <h3 className="font-semibold mb-3 text-lg">🛒 Hotmart</h3>
              <div className="space-y-2 text-sm">
                <p><strong>1.</strong> Acesse o painel da Hotmart</p>
                <p><strong>2.</strong> Vá em Configurações → Webhooks</p>
                <p><strong>3.</strong> Adicione a URL: <code className="bg-gray-100 px-2 py-1 rounded">{webhookUrl}</code></p>
                <p><strong>4.</strong> Configure o campo <Badge variant="outline">SCK</Badge> com o valor: <code className="bg-gray-100 px-2 py-1 rounded">{'{{clickId}}'}</code></p>
                <p><strong>5.</strong> Ative os eventos de conversão desejados</p>
              </div>
            </div>

            {/* Checkout Próprio */}
            <div>
              <h3 className="font-semibold mb-3 text-lg">💻 Checkout Próprio</h3>
              <div className="space-y-2 text-sm">
                <p><strong>1.</strong> No seu sistema de checkout, configure o webhook para: <code className="bg-gray-100 px-2 py-1 rounded">{webhookUrl}</code></p>
                <p><strong>2.</strong> Inclua o campo <Badge variant="outline">SRC</Badge> com o clickID do usuário</p>
                <p><strong>3.</strong> Envie os dados da compra (valor, moeda, etc.)</p>
                <p><strong>4.</strong> Use método POST com Content-Type: application/json</p>
              </div>
            </div>

            {/* Outras Plataformas */}
            <div>
              <h3 className="font-semibold mb-3 text-lg">🔧 Outras Plataformas</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Campos Suportados:</strong></p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Badge variant="outline">SCK</Badge>
                  <Badge variant="outline">SRC</Badge>
                  <Badge variant="outline">sck</Badge>
                  <Badge variant="outline">src</Badge>
                  <Badge variant="outline">session_id</Badge>
                  <Badge variant="outline">click_id</Badge>
                </div>
                <p className="mt-3">O sistema tentará encontrar o clickID em qualquer um desses campos (ordem de prioridade).</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teste */}
      <Card>
        <CardHeader>
          <CardTitle>🧪 Teste de Webhook</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Use a página de teste para validar o funcionamento do webhook antes de configurar na plataforma externa.
            </p>
            <Button
              onClick={() => window.open('/test-webhook-conversion.html', '_blank')}
              className="w-full"
            >
              Abrir Página de Teste
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}