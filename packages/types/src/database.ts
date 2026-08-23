/**
 * Hand-written until the project has a real Supabase project to generate against.
 * Once `supabase link` is run, replace this file's contents with the output of:
 *   supabase gen types typescript --linked > packages/types/src/database.ts
 * Shape mirrors supabase/migrations/*.sql — keep both in sync.
 */
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
          created_at: string;
        };
        Insert: {
          id?: string;
          estimate_id: string;
          kind: string;
          description: string;
          quantity?: number;
          unit_price: number;
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
  | "sla.manage";

export type ServiceRequestStatus = "OPEN" | "ACCEPTED" | "REJECTED" | "CANCELED";
export type WorkOrderStatus = "OPEN" | "IN_PROGRESS" | "READY" | "DELIVERED" | "CANCELED";
export type EstimateStatus = "SENT" | "APPROVED" | "REJECTED" | "SUPERSEDED";
export type EstimateItemKind = "PART" | "LABOR";
export type AppointmentStatus = "SCHEDULED" | "CONFIRMED" | "DONE" | "CANCELED" | "NO_SHOW";
export type SlaStatus = "NONE" | "ON_TRACK" | "AT_RISK" | "BREACHED" | "MET" | "MISSED" | "CANCELED";
