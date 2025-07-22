import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Users, Mail, Phone, MapPin, Calendar, Target, TrendingUp } from "lucide-react";
import type { Lead } from "@shared/schema";

const statusColors = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  contacted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  qualified: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  converted: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  lost: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
};

const statusLabels = {
  new: "Novo",
  contacted: "Contatado",
  qualified: "Qualificado",
  converted: "Convertido",
  lost: "Perdido"
};

export default function Leads() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["/api/leads"],
  });

  const { data: analytics } = useQuery({
    queryKey: ["/api/leads/analytics"],
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ leadId, status, notes }: { leadId: number; status: string; notes?: string }) => {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update lead");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads/analytics"] });
      setSelectedLead(null);
      setStatus("");
      setNotes("");
    },
  });

  const handleUpdateLead = () => {
    if (selectedLead && status) {
      updateLeadMutation.mutate({
        leadId: selectedLead.id,
        status,
        notes: notes || undefined
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Leads</h1>
          <p className="text-muted-foreground">
            Acompanhe e gerencie todos os leads capturados
          </p>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalLeads}</div>
              <p className="text-xs text-muted-foreground">Leads capturados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Principal Fonte</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.leadsBySource[0]?.source || "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.leadsBySource[0]?.count || 0} leads
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {leads.filter((l: Lead) => l.status === 'converted').length > 0 
                  ? Math.round((leads.filter((l: Lead) => l.status === 'converted').length / leads.length) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">Leads convertidos</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Leads</CardTitle>
          <CardDescription>
            Todos os leads capturados via postback e formulários
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhum lead encontrado</p>
              <p className="text-sm">Os leads aparecerão aqui quando forem capturados</p>
            </div>
          ) : (
            <div className="space-y-4">
              {leads.map((lead: Lead) => (
                <div
                  key={lead.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium">{lead.name}</h3>
                        <Badge className={statusColors[lead.status as keyof typeof statusColors]}>
                          {statusLabels[lead.status as keyof typeof statusLabels]}
                        </Badge>
                      </div>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {lead.email}
                        </div>
                        
                        {lead.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {lead.phone}
                          </div>
                        )}
                        
                        {lead.country && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {lead.city ? `${lead.city}, ${lead.country}` : lead.country}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(lead.createdAt)}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs">
                        {lead.source && (
                          <Badge variant="outline">Fonte: {lead.source}</Badge>
                        )}
                        {lead.campaignId && (
                          <Badge variant="outline">Campanha: {lead.campaignId}</Badge>
                        )}
                        {lead.clickId && (
                          <Badge variant="outline">Click ID: {lead.clickId.slice(-8)}</Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedLead(lead);
                              setStatus(lead.status);
                              setNotes(lead.notes || "");
                            }}
                          >
                            Editar Status
                          </Button>
                        </DialogTrigger>
                        
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Atualizar Lead</DialogTitle>
                            <DialogDescription>
                              Altere o status e adicione observações para {lead.name}
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="status">Status</Label>
                              <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="new">Novo</SelectItem>
                                  <SelectItem value="contacted">Contatado</SelectItem>
                                  <SelectItem value="qualified">Qualificado</SelectItem>
                                  <SelectItem value="converted">Convertido</SelectItem>
                                  <SelectItem value="lost">Perdido</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="grid gap-2">
                              <Label htmlFor="notes">Observações</Label>
                              <Textarea
                                id="notes"
                                placeholder="Adicione observações sobre este lead..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                              />
                            </div>
                          </div>
                          
                          <DialogFooter>
                            <Button 
                              onClick={handleUpdateLead}
                              disabled={updateLeadMutation.isPending}
                            >
                              {updateLeadMutation.isPending ? "Salvando..." : "Salvar"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Endpoint Information */}
      <Card>
        <CardHeader>
          <CardTitle>Endpoint de Postback</CardTitle>
          <CardDescription>
            Configure seu sistema para enviar leads via postback
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-medium mb-2">POST /leads</p>
            <p className="text-xs text-muted-foreground mb-4">
              Envie leads com os seguintes campos:
            </p>
            
            <pre className="text-xs bg-background p-3 rounded border overflow-x-auto">
{`{
  "name": "Nome do Lead",           // Obrigatório
  "email": "email@example.com",     // Obrigatório
  "phone": "+55 11 99999-9999",     // Opcional
  "click_id": "mc_campaign_12345",  // Opcional (para associar ao click)
  "campaign_id": "campaign-name",   // Opcional
  "source": "facebook",             // Opcional
  "medium": "cpc",                  // Opcional
  "campaign": "nome_campanha"       // Opcional
}`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}