/**
 * Hand-written until the project has a real Supabase project to generate against.
 * Once `supabase link` is run, replace this file's contents with the output of:
 *   supabase gen types typescript --linked > packages/types/src/database.ts
 * Shape mirrors supabase/migrations/*.sql — keep both in sync.
 */
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          status: "ACTIVE" | "SUSPENDED" | "CANCELED";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          status?: "ACTIVE" | "SUSPENDED" | "CANCELED";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tenants"]["Insert"]>;
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          tenant_id: string | null;
          name: string;
          email: string;
          phone: string | null;
          status: "ACTIVE" | "INACTIVE" | "BLOCKED";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          tenant_id?: string | null;
          name: string;
          email: string;
          phone?: string | null;
          status?: "ACTIVE" | "INACTIVE" | "BLOCKED";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "users_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      roles: {
        Row: {
          id: string;
          tenant_id: string | null;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string | null;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["roles"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "roles_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      permissions: {
        Row: {
          id: string;
          code: string;
          description: string | null;
        };
        Insert: {
          id?: string;
          code: string;
          description?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["permissions"]["Insert"]>;
        Relationships: [];
      };
      role_permissions: {
        Row: {
          role_id: string;
          permission_id: string;
        };
        Insert: {
          role_id: string;
          permission_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["role_permissions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey";
            columns: ["role_id"];
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_permissions_permission_id_fkey";
            columns: ["permission_id"];
            referencedRelation: "permissions";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          user_id: string;
          role_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          role_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_roles"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_roles_role_id_fkey";
            columns: ["role_id"];
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      vehicles: {
        Row: {
          id: string;
          customer_id: string;
          plate: string | null;
          brand: string;
          model: string;
          version: string | null;
          manufacture_year: number | null;
          model_year: number | null;
          engine: string | null;
          fuel_type: string | null;
          color: string | null;
          mileage: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          plate?: string | null;
          brand: string;
          model: string;
          version?: string | null;
          manufacture_year?: number | null;
          model_year?: number | null;
          engine?: string | null;
          fuel_type?: string | null;
          color?: string | null;
          mileage?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["vehicles"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "vehicles_customer_id_fkey";
            columns: ["customer_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      vehicle_mileage_history: {
        Row: {
          id: string;
          vehicle_id: string;
          mileage: number;
          source: string;
          recorded_at: string;
          recorded_by: string | null;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          mileage: number;
          source?: string;
          recorded_at?: string;
          recorded_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["vehicle_mileage_history"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "vehicle_mileage_history_vehicle_id_fkey";
            columns: ["vehicle_id"];
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      service_requests: {
        Row: {
          id: string;
          tenant_id: string;
          customer_id: string;
          vehicle_id: string;
          description: string;
          priority: string;
          status: string;
          requested_at: string;
          accepted_at: string | null;
          closed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          customer_id: string;
          vehicle_id: string;
          description: string;
          priority?: string;
          status?: string;
          requested_at?: string;
          accepted_at?: string | null;
          closed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["service_requests"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "service_requests_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_requests_vehicle_id_fkey";
            columns: ["vehicle_id"];
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_requests_customer_id_fkey";
            columns: ["customer_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      work_orders: {
        Row: {
          id: string;
          tenant_id: string;
          service_request_id: string | null;
          customer_id: string;
          vehicle_id: string;
          estimate_id: string | null;
          status: string;
          notes: string | null;
          opened_at: string;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
          /** Computed column (function of the row type) — see work_orders_sla_status() in Functions below. */
          work_orders_sla_status: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          service_request_id?: string | null;
          customer_id: string;
          vehicle_id: string;
          estimate_id?: string | null;
          status?: string;
          notes?: string | null;
          opened_at?: string;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["work_orders"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "work_orders_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_orders_service_request_id_fkey";
            columns: ["service_request_id"];
            referencedRelation: "service_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_orders_vehicle_id_fkey";
            columns: ["vehicle_id"];
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_orders_customer_id_fkey";
            columns: ["customer_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_orders_estimate_id_fkey";
            columns: ["estimate_id"];
            referencedRelation: "estimates";
            referencedColumns: ["id"];
          },
        ];
      };
      diagnostics: {
        Row: {
          id: string;
          tenant_id: string;
          service_request_id: string;
          customer_id: string;
          summary: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          service_request_id: string;
          customer_id: string;
          summary: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["diagnostics"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "diagnostics_service_request_id_fkey";
            columns: ["service_request_id"];
            referencedRelation: "service_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      estimates: {
        Row: {
          id: string;
          tenant_id: string;
          service_request_id: string;
          customer_id: string;
          version: number;
          status: string;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          service_request_id: string;
          customer_id: string;
          version?: number;
          status?: string;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["estimates"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "estimates_service_request_id_fkey";
            columns: ["service_request_id"];
            referencedRelation: "service_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      estimate_items: {
        Row: {
          id: string;
          estimate_id: string;
          kind: string;
          description: string;
          quantity: number;
          unit_price: number;
          product_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          estimate_id: string;
          kind: string;
          description: string;
          quantity?: number;
          unit_price: number;
          product_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["estimate_items"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "estimate_items_estimate_id_fkey";
            columns: ["estimate_id"];
            referencedRelation: "estimates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "estimate_items_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      work_order_events: {
        Row: {
          id: string;
          work_order_id: string;
          event_type: string;
          old_status: string | null;
          new_status: string | null;
          description: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          work_order_id: string;
          event_type: string;
          old_status?: string | null;
          new_status?: string | null;
          description?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["work_order_events"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "work_order_events_work_order_id_fkey";
            columns: ["work_order_id"];
            referencedRelation: "work_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      sla_definitions: {
        Row: {
          id: string;
          tenant_id: string;
          default_hours: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          default_hours?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sla_definitions"]["Insert"]>;
        Relationships: [];
      };
      sla_instances: {
        Row: {
          id: string;
          tenant_id: string;
          work_order_id: string;
          due_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          work_order_id: string;
          due_at: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sla_instances"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "sla_instances_work_order_id_fkey";
            columns: ["work_order_id"];
            isOneToOne: true;
            referencedRelation: "work_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      appointments: {
        Row: {
          id: string;
          tenant_id: string;
          work_order_id: string;
          customer_id: string;
          scheduled_at: string;
          status: string;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          work_order_id: string;
          customer_id: string;
          scheduled_at: string;
          status?: string;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["appointments"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "appointments_work_order_id_fkey";
            columns: ["work_order_id"];
            isOneToOne: true;
            referencedRelation: "work_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      maintenance_records: {
        Row: {
          id: string;
          vehicle_id: string;
          tenant_id: string | null;
          work_order_id: string | null;
          source: string;
          description: string;
          mileage: number | null;
          cost: number | null;
          performed_at: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          tenant_id?: string | null;
          work_order_id?: string | null;
          source: string;
          description: string;
          mileage?: number | null;
          cost?: number | null;
          performed_at?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["maintenance_records"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "maintenance_records_vehicle_id_fkey";
            columns: ["vehicle_id"];
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      warranty_definitions: {
        Row: {
          id: string;
          tenant_id: string;
          default_months: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          default_months?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["warranty_definitions"]["Insert"]>;
        Relationships: [];
      };
      warranties: {
        Row: {
          id: string;
          vehicle_id: string;
          tenant_id: string;
          work_order_id: string;
          maintenance_record_id: string | null;
          description: string;
          expires_at: string;
          created_at: string;
          /** Computed column (function of the row type) — see warranties_status() in Functions below. */
          warranties_status: string;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          tenant_id: string;
          work_order_id: string;
          maintenance_record_id?: string | null;
          description: string;
          expires_at: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["warranties"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "warranties_vehicle_id_fkey";
            columns: ["vehicle_id"];
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "warranties_work_order_id_fkey";
            columns: ["work_order_id"];
            isOneToOne: true;
            referencedRelation: "work_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          id: string;
          tenant_id: string;
          sku: string | null;
          name: string;
          unit: string;
          unit_cost: number | null;
          unit_price: number | null;
          min_stock: number;
          stock_on_hand: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          sku?: string | null;
          name: string;
          unit?: string;
          unit_cost?: number | null;
          unit_price?: number | null;
          min_stock?: number;
          stock_on_hand?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [];
      };
      suppliers: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          phone: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          phone?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["suppliers"]["Insert"]>;
        Relationships: [];
      };
      purchases: {
        Row: {
          id: string;
          tenant_id: string;
          supplier_id: string | null;
          status: string;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          received_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          supplier_id?: string | null;
          status?: string;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          received_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["purchases"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "purchases_supplier_id_fkey";
            columns: ["supplier_id"];
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ];
      };
      purchase_items: {
        Row: {
          id: string;
          purchase_id: string;
          product_id: string;
          quantity: number;
          unit_cost: number;
        };
        Insert: {
          id?: string;
          purchase_id: string;
          product_id: string;
          quantity: number;
          unit_cost: number;
        };
        Update: Partial<Database["public"]["Tables"]["purchase_items"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "purchase_items_purchase_id_fkey";
            columns: ["purchase_id"];
            referencedRelation: "purchases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_items_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_movements: {
        Row: {
          id: string;
          tenant_id: string;
          product_id: string;
          type: string;
          quantity: number;
          work_order_id: string | null;
          purchase_id: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          product_id: string;
          type: string;
          quantity: number;
          work_order_id?: string | null;
          purchase_id?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["inventory_movements"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "inventory_movements_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      accounts_receivable: {
        Row: {
          id: string;
          tenant_id: string;
          customer_id: string;
          work_order_id: string;
          amount: number;
          paid_amount: number;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          customer_id: string;
          work_order_id: string;
          amount: number;
          paid_amount?: number;
          status?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["accounts_receivable"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "accounts_receivable_work_order_id_fkey";
            columns: ["work_order_id"];
            isOneToOne: true;
            referencedRelation: "work_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      accounts_payable: {
        Row: {
          id: string;
          tenant_id: string;
          supplier_id: string | null;
          purchase_id: string;
          amount: number;
          paid_amount: number;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          supplier_id?: string | null;
          purchase_id: string;
          amount: number;
          paid_amount?: number;
          status?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["accounts_payable"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "accounts_payable_purchase_id_fkey";
            columns: ["purchase_id"];
            isOneToOne: true;
            referencedRelation: "purchases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "accounts_payable_supplier_id_fkey";
            columns: ["supplier_id"];
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          tenant_id: string;
          receivable_id: string | null;
          payable_id: string | null;
          amount: number;
          method: string;
          idempotency_key: string;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          receivable_id?: string | null;
          payable_id?: string | null;
          amount: number;
          method: string;
          idempotency_key: string;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "payments_receivable_id_fkey";
            columns: ["receivable_id"];
            referencedRelation: "accounts_receivable";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_payable_id_fkey";
            columns: ["payable_id"];
            referencedRelation: "accounts_payable";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          tenant_id: string | null;
          actor_id: string | null;
          action: string;
          table_name: string;
          record_id: string | null;
          before: Json | null;
          after: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string | null;
          actor_id?: string | null;
          action: string;
          table_name: string;
          record_id?: string | null;
          before?: Json | null;
          after?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_logs_actor_id_fkey";
            columns: ["actor_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_tenant_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      has_permission: {
        Args: { permission_code: string };
        Returns: boolean;
      };
      work_orders_sla_status: {
        Args: { wo: Database["public"]["Tables"]["work_orders"]["Row"] };
        Returns: string;
      };
      warranties_status: {
        Args: { w: Database["public"]["Tables"]["warranties"]["Row"] };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type PermissionCode =
  | "tenant.manage"
  | "user.manage"
  | "vehicle.create"
  | "vehicle.update"
  | "work_order.update"
  | "estimate.approve"
  | "platform.super_admin"
  | "service_request.manage"
  | "diagnostic.manage"
  | "estimate.manage"
  | "appointment.manage"
  | "sla.manage"
  | "warranty.manage"
  | "product.manage"
  | "purchase.manage"
  | "financial.manage";

export type ServiceRequestStatus = "OPEN" | "ACCEPTED" | "REJECTED" | "CANCELED";
export type WorkOrderStatus = "OPEN" | "IN_PROGRESS" | "READY" | "DELIVERED" | "CANCELED";
export type EstimateStatus = "SENT" | "APPROVED" | "REJECTED" | "SUPERSEDED";
export type EstimateItemKind = "PART" | "LABOR";
export type AppointmentStatus = "SCHEDULED" | "CONFIRMED" | "DONE" | "CANCELED" | "NO_SHOW";
export type SlaStatus = "NONE" | "ON_TRACK" | "AT_RISK" | "BREACHED" | "MET" | "MISSED" | "CANCELED";
export type MaintenanceSource = "WORK_ORDER" | "MANUAL";
export type WarrantyStatus = "ACTIVE" | "EXPIRED";
export type PurchaseStatus = "DRAFT" | "ORDERED" | "RECEIVED" | "CANCELED";
export type InventoryMovementType = "PURCHASE" | "USAGE" | "ADJUSTMENT" | "RETURN";
export type AccountStatus = "OPEN" | "PAID" | "CANCELED";
export type PaymentMethod = "PIX" | "CARD" | "CASH" | "TRANSFER" | "OTHER";
export type AuditAction = "INSERT" | "UPDATE" | "DELETE";
