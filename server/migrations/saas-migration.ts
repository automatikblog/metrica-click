import { db } from "../db";
import { tenants, usersNew, campaigns, clicks, pageViews, adSpend, conversions, campaignSettings } from "@shared/schema";
import { hashPassword } from "../utils/password";

/**
 * Migration script to transform MétricaClick into a SaaS multiuser system
 * 
 * This script:
 * 1. Creates the AutomatikBlog tenant
 * 2. Creates the admin user
 * 3. Associates all existing data with the AutomatikBlog tenant
 */
export async function migrateMétricaClickToSaaS() {
  console.log("🚀 Starting MétricaClick SaaS migration...");
  
  try {
    // Step 1: Create AutomatikBlog tenant
    console.log("1. Creating AutomatikBlog tenant...");
    const [tenant] = await db.insert(tenants).values({
      name: "AutomatikBlog",
      slug: "automatikblog",
      subscriptionPlan: "enterprise",
      subscriptionStatus: "active",
      maxCampaigns: -1, // unlimited
      maxMonthlyClicks: -1, // unlimited
    }).returning();
    
    console.log(`✅ Tenant created: ${tenant.name} (ID: ${tenant.id})`);
    
    // Step 2: Create admin user
    console.log("2. Creating admin user...");
    const hashedPassword = await hashPassword("123456");
    
    const [adminUser] = await db.insert(usersNew).values({
      tenantId: tenant.id,
      email: "automatiklabs13@gmail.com",
      password: hashedPassword,
      firstName: "Admin",
      lastName: "AutomatikBlog",
      role: "admin",
      status: "active"
    }).returning();
    
    console.log(`✅ Admin user created: ${adminUser.email} (ID: ${adminUser.id})`);
    
    // Step 3: Add tenant_id column to existing tables if not exists
    console.log("3. Adding tenant_id columns to existing tables...");
    
    await db.execute(`
      DO $$ 
      BEGIN
        -- Add tenant_id to campaigns if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='tenant_id') THEN
          ALTER TABLE campaigns ADD COLUMN tenant_id INTEGER NOT NULL DEFAULT ${tenant.id} REFERENCES tenants(id) ON DELETE CASCADE;
        END IF;
        
        -- Add tenant_id to clicks if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clicks' AND column_name='tenant_id') THEN
          ALTER TABLE clicks ADD COLUMN tenant_id INTEGER NOT NULL DEFAULT ${tenant.id} REFERENCES tenants(id) ON DELETE CASCADE;
        END IF;
        
        -- Add tenant_id to page_views if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='page_views' AND column_name='tenant_id') THEN
          ALTER TABLE page_views ADD COLUMN tenant_id INTEGER NOT NULL DEFAULT ${tenant.id} REFERENCES tenants(id) ON DELETE CASCADE;
        END IF;
        
        -- Add tenant_id to ad_spend if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ad_spend' AND column_name='tenant_id') THEN
          ALTER TABLE ad_spend ADD COLUMN tenant_id INTEGER NOT NULL DEFAULT ${tenant.id} REFERENCES tenants(id) ON DELETE CASCADE;
        END IF;
        
        -- Add tenant_id to conversions if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversions' AND column_name='tenant_id') THEN
          ALTER TABLE conversions ADD COLUMN tenant_id INTEGER NOT NULL DEFAULT ${tenant.id} REFERENCES tenants(id) ON DELETE CASCADE;
        END IF;
        
        -- Add tenant_id to campaign_settings if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaign_settings' AND column_name='tenant_id') THEN
          ALTER TABLE campaign_settings ADD COLUMN tenant_id INTEGER NOT NULL DEFAULT ${tenant.id} REFERENCES tenants(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    
    console.log("✅ tenant_id columns added to all tables");
    
    // Step 4: Update all existing data to belong to AutomatikBlog tenant
    console.log("4. Associating existing data with AutomatikBlog tenant...");
    
    // Count existing data
    const campaignsCount = await db.execute('SELECT COUNT(*) FROM campaigns');
    const clicksCount = await db.execute('SELECT COUNT(*) FROM clicks');
    const pageViewsCount = await db.execute('SELECT COUNT(*) FROM page_views');
    const adSpendCount = await db.execute('SELECT COUNT(*) FROM ad_spend');
    const conversionsCount = await db.execute('SELECT COUNT(*) FROM conversions');
    const campaignSettingsCount = await db.execute('SELECT COUNT(*) FROM campaign_settings');
    
    console.log(`📊 Data migration summary:`);
    console.log(`   - Campaigns: ${campaignsCount.rows[0].count}`);
    console.log(`   - Clicks: ${clicksCount.rows[0].count}`);
    console.log(`   - Page Views: ${pageViewsCount.rows[0].count}`);
    console.log(`   - Ad Spend: ${adSpendCount.rows[0].count}`);
    console.log(`   - Conversions: ${conversionsCount.rows[0].count}`);
    console.log(`   - Campaign Settings: ${campaignSettingsCount.rows[0].count}`);
    
    // Step 5: Update all data to set correct tenant_id
    await db.execute(`UPDATE campaigns SET tenant_id = ${tenant.id} WHERE tenant_id != ${tenant.id}`);
    await db.execute(`UPDATE clicks SET tenant_id = ${tenant.id} WHERE tenant_id != ${tenant.id}`);
    await db.execute(`UPDATE page_views SET tenant_id = ${tenant.id} WHERE tenant_id != ${tenant.id}`);
    await db.execute(`UPDATE ad_spend SET tenant_id = ${tenant.id} WHERE tenant_id != ${tenant.id}`);
    await db.execute(`UPDATE conversions SET tenant_id = ${tenant.id} WHERE tenant_id != ${tenant.id}`);
    await db.execute(`UPDATE campaign_settings SET tenant_id = ${tenant.id} WHERE tenant_id != ${tenant.id}`);
    
    console.log("✅ All existing data associated with AutomatikBlog tenant");
    
    // Step 6: Create necessary indexes for performance
    console.log("5. Creating indexes for tenant_id columns...");
    
    await db.execute(`
      DO $$ 
      BEGIN
        -- Create indexes if not exist
        CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_id ON campaigns(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_clicks_tenant_id ON clicks(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_page_views_tenant_id ON page_views(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_ad_spend_tenant_id ON ad_spend(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_conversions_tenant_id ON conversions(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_campaign_settings_tenant_id ON campaign_settings(tenant_id);
      END $$;
    `);
    
    console.log("✅ Tenant indexes created");
    
    console.log("");
    console.log("🎉 MétricaClick SaaS migration completed successfully!");
    console.log("");
    console.log("📝 Login credentials:");
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Password: 123456`);
    console.log(`   Tenant: ${tenant.name} (${tenant.slug})`);
    console.log("");
    console.log("🔒 IMPORTANT: Change the admin password after first login!");
    
    return {
      tenant,
      adminUser,
      success: true
    };
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

// Execute migration if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateMétricaClickToSaaS()
    .then(() => {
      console.log("Migration completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}