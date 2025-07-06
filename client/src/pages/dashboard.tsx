import { StatsCards } from "@/components/stats-cards";
import { RecentActivity } from "@/components/recent-activity";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

export default function Dashboard() {
  const [config, setConfig] = useState({
    attribution: "lastpaid",
    cookieDuration: "90",
    defaultCampaignId: "683f45642498fc6fe758357f",
    cookieDomain: "automatikblog.com",
    regViewOnce: false
  });

  const generateScriptUrl = () => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams({
      attribution: config.attribution,
      cookiedomain: config.cookieDomain,
      cookieduration: config.cookieDuration,
      defaultcampaignid: config.defaultCampaignId,
      regviewonce: config.regViewOnce.toString()
    });
    
    return `${baseUrl}/mc.js?${params.toString()}`;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
            <p className="text-gray-600">Monitor your traffic tracking performance</p>
          </div>
          <div className="flex items-center space-x-4">
            <button className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors">
              <i className="fas fa-bell text-lg"></i>
              <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full"></span>
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">JD</span>
              </div>
              <span className="text-gray-700 font-medium">John Doe</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <StatsCards />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Chart Section */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Click Analytics</h3>
              <div className="flex items-center space-x-2">
                <Select defaultValue="7days">
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7days">Last 7 days</SelectItem>
                    <SelectItem value="30days">Last 30 days</SelectItem>
                    <SelectItem value="90days">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center text-gray-500">
                <i className="fas fa-chart-area text-4xl mb-2"></i>
                <p>Chart visualization would be implemented here</p>
                <p className="text-sm">Showing click trends and performance metrics</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
            <div className="space-y-4">
              <Button className="w-full flex items-center justify-between">
                <span className="flex items-center">
                  <i className="fas fa-plus mr-3"></i>
                  New Campaign
                </span>
                <i className="fas fa-arrow-right"></i>
              </Button>
              
              <Button variant="outline" className="w-full flex items-center justify-between">
                <span className="flex items-center">
                  <i className="fas fa-code mr-3"></i>
                  Generate Script
                </span>
                <i className="fas fa-arrow-right"></i>
              </Button>
              
              <Button variant="outline" className="w-full flex items-center justify-between">
                <span className="flex items-center">
                  <i className="fas fa-file-alt mr-3"></i>
                  View Reports
                </span>
                <i className="fas fa-arrow-right"></i>
              </Button>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Integration Script</h4>
              <p className="text-sm text-gray-600 mb-3">Add this script to your website:</p>
              <div className="bg-white p-3 rounded border text-xs font-mono text-gray-800 overflow-x-auto">
                {`<script src="${generateScriptUrl()}"></script>`}
              </div>
            </div>
          </div>
        </div>

        <RecentActivity />

        {/* Configuration Panel */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Tracking Configuration</h3>
            <p className="text-gray-600 text-sm mt-1">Configure your tracking parameters and attribution models</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  value={config.defaultCampaignId}
                  onChange={(e) => setConfig({...config, defaultCampaignId: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="cookieDomain">Cookie Domain</Label>
                <Input 
                  id="cookieDomain"
                  value={config.cookieDomain}
                  onChange={(e) => setConfig({...config, cookieDomain: e.target.value})}
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
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <Button variant="outline">Reset</Button>
              <Button>Save Configuration</Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
