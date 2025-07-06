import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

export default function Integration() {
  const { toast } = useToast();
  const [config, setConfig] = useState({
    attribution: "lastpaid",
    cookieDomain: "",
    cookieDuration: "90",
    defaultCampaignId: "",
    regViewOnce: false
  });

  const generateScript = () => {
    // Use environment variable in production, fallback to current origin for development
    const baseUrl = import.meta.env.VITE_API_URL || window.location.origin;
    const params = new URLSearchParams();
    
    if (config.attribution) params.append('attribution', config.attribution);
    if (config.cookieDomain) params.append('cookiedomain', config.cookieDomain);
    if (config.cookieDuration) params.append('cookieduration', config.cookieDuration);
    if (config.defaultCampaignId) params.append('defaultcampaignid', config.defaultCampaignId);
    params.append('regviewonce', config.regViewOnce.toString());
    
    return `<script src="${baseUrl}/mc.js?${params.toString()}"></script>`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Script code copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex-1 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Integration</h2>
        <p className="text-gray-600">Set up tracking on your website</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Tracking Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="attribution">Attribution Model</Label>
              <Select value={config.attribution} onValueChange={(value) => setConfig({...config, attribution: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lastpaid">Last Paid Click</SelectItem>
                  <SelectItem value="firstclick">First Click</SelectItem>
                  <SelectItem value="lastclick">Last Click</SelectItem>
                  <SelectItem value="firstpaid">First Paid Click</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="cookieDomain">Cookie Domain</Label>
              <Input 
                id="cookieDomain"
                placeholder="example.com"
                value={config.cookieDomain}
                onChange={(e) => setConfig({...config, cookieDomain: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="cookieDuration">Cookie Duration (days)</Label>
              <Input 
                id="cookieDuration"
                type="number" 
                value={config.cookieDuration}
                onChange={(e) => setConfig({...config, cookieDuration: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="defaultCampaignId">Default Campaign ID</Label>
              <Input 
                id="defaultCampaignId"
                placeholder="683f45642498fc6fe758357f"
                value={config.defaultCampaignId}
                onChange={(e) => setConfig({...config, defaultCampaignId: e.target.value})}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="regviewonce" 
                checked={config.regViewOnce}
                onCheckedChange={(checked) => setConfig({...config, regViewOnce: checked as boolean})}
              />
              <Label htmlFor="regviewonce">Register View Once</Label>
            </div>
          </CardContent>
        </Card>

        {/* Generated Script */}
        <Card>
          <CardHeader>
            <CardTitle>Integration Script</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Generated Script Tag</Label>
                <div className="mt-2 p-3 bg-gray-100 rounded-md border font-mono text-sm break-all">
                  {generateScript()}
                </div>
                <Button 
                  onClick={() => copyToClipboard(generateScript())}
                  className="mt-2 w-full"
                  variant="outline"
                >
                  <i className="fas fa-copy mr-2"></i>
                  Copy Script
                </Button>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Installation Instructions</h4>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>Copy the script tag above</li>
                  <li>Paste it in the &lt;head&gt; section of your website</li>
                  <li>The script will automatically track clicks and page views</li>
                  <li>Use URL parameters to pass campaign data</li>
                </ol>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">URL Parameters</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div><code>cmpid</code> - Campaign ID</div>
                  <div><code>mcid</code> - Click ID (optional)</div>
                  <div><code>tsource</code> - Traffic source (optional)</div>
                  <div><code>_fbp</code> - Facebook browser ID</div>
                  <div><code>_fbc</code> - Facebook click ID</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Documentation */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>API Endpoints</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">GET /track/:campaignID</h4>
              <p className="text-sm text-gray-600 mb-2">Generate a click ID for a campaign</p>
              <div className="bg-gray-100 p-2 rounded font-mono text-sm">
                GET {window.location.origin}/track/abc123?format=json&referrer=...
              </div>
              <div className="mt-2 text-sm">
                <strong>Response:</strong> <code>{`{"clickid": "mc_abc123_1699202392837"}`}</code>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">GET /view</h4>
              <p className="text-sm text-gray-600 mb-2">Register a page view for a click ID</p>
              <div className="bg-gray-100 p-2 rounded font-mono text-sm">
                GET {window.location.origin}/view?clickid=mc_abc123_1699...&referrer=...
              </div>
              <div className="mt-2 text-sm">
                <strong>Response:</strong> <code>200 OK</code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
