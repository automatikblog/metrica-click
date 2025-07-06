declare module 'facebook-nodejs-business-sdk' {
  export class FacebookAdsApi {
    static init(accessToken: string): FacebookAdsApi;
  }

  export class AdAccount {
    constructor(id: string);
    get(fields: string[]): Promise<any>;
    getCampaigns(fields: string[]): Promise<any[]>;
    getInsights(fields: string[], params?: any): Promise<any[]>;
  }

  export class Campaign {
    constructor(id: string);
    get(fields: string[]): Promise<any>;
    getInsights(fields: string[], params?: any): Promise<any[]>;
  }

  export class AdSet {
    constructor(id: string);
    get(fields: string[]): Promise<any>;
  }

  export class Ad {
    constructor(id: string);
    get(fields: string[]): Promise<any>;
  }

  export class Insights {
    constructor();
  }
}