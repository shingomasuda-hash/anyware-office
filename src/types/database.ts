// Database types for the AnyWare OFFICE Supabase project.
//
// Hand-written from the READ ONLY schema snapshot exported from the live
// database (docs/supabase-schema-snapshot.json, 2026-08-08). The live
// database is the source of truth — if the schema changes, re-export the
// snapshot and update this file. Do not edit to match wished-for columns.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      // Created by supabase/migrations/step5_agenda_links.sql. Until
      // that migration is applied the table is absent and reads return
      // a "table not found" error, which the repository turns into an
      // empty list plus a flag rather than an office-wide failure.
      agenda_items: {
        Row: {
          id: string;
          meeting_id: string;
          position: number;
          title: string;
          detail: string | null;
          owner_id: string | null;
          minutes: number | null;
          decision: string | null;
          status: "open" | "in_progress" | "done" | "carried_over";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          position?: number;
          title: string;
          detail?: string | null;
          owner_id?: string | null;
          minutes?: number | null;
          decision?: string | null;
          status?: "open" | "in_progress" | "done" | "carried_over";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          position?: number;
          title?: string;
          detail?: string | null;
          owner_id?: string | null;
          minutes?: number | null;
          decision?: string | null;
          status?: "open" | "in_progress" | "done" | "carried_over";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      resource_links: {
        Row: {
          id: string;
          label: string;
          url: string;
          kind: "sheet" | "doc" | "folder" | "form" | "other";
          section_id: string | null;
          project_id: string | null;
          meeting_id: string | null;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          label: string;
          url: string;
          kind?: "sheet" | "doc" | "folder" | "form" | "other";
          section_id?: string | null;
          project_id?: string | null;
          meeting_id?: string | null;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          label?: string;
          url?: string;
          kind?: "sheet" | "doc" | "folder" | "form" | "other";
          section_id?: string | null;
          project_id?: string | null;
          meeting_id?: string | null;
          position?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      announcements: {
        Row: {
          id: string;
          title: string;
          body: string;
          priority: Database["public"]["Enums"]["announcement_priority"];
          visible_roles: Database["public"]["Enums"]["user_role"][];
          published_at: string;
          expires_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          body?: string;
          priority?: Database["public"]["Enums"]["announcement_priority"];
          visible_roles?: Database["public"]["Enums"]["user_role"][];
          published_at?: string;
          expires_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          body?: string;
          priority?: Database["public"]["Enums"]["announcement_priority"];
          visible_roles?: Database["public"]["Enums"]["user_role"][];
          published_at?: string;
          expires_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      business_sections: {
        Row: {
          id: string;
          section_key: Database["public"]["Enums"]["section_key"];
          title: string;
          tagline: string;
          description: string;
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          section_key: Database["public"]["Enums"]["section_key"];
          title: string;
          tagline?: string;
          description?: string;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          section_key?: Database["public"]["Enums"]["section_key"];
          title?: string;
          tagline?: string;
          description?: string;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      case_studies: {
        Row: {
          id: string;
          title: string;
          client_name: string;
          section_key: Database["public"]["Enums"]["section_key"];
          summary: string;
          result: string;
          thumbnail_url: string | null;
          project_url: string | null;
          is_public: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          client_name?: string;
          section_key: Database["public"]["Enums"]["section_key"];
          summary?: string;
          result?: string;
          thumbnail_url?: string | null;
          project_url?: string | null;
          is_public?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          client_name?: string;
          section_key?: Database["public"]["Enums"]["section_key"];
          summary?: string;
          result?: string;
          thumbnail_url?: string | null;
          project_url?: string | null;
          is_public?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      executive_metrics: {
        Row: {
          id: string;
          metric_key: string;
          label: string;
          value: number;
          unit: string;
          period: string;
          comparison_value: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          metric_key: string;
          label: string;
          value?: number;
          unit?: string;
          period?: string;
          comparison_value?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          metric_key?: string;
          label?: string;
          value?: number;
          unit?: string;
          period?: string;
          comparison_value?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      green_deals: {
        Row: {
          id: string;
          company_name: string;
          deal_name: string;
          stage: Database["public"]["Enums"]["deal_stage"];
          amount: number;
          probability: number;
          next_action: string;
          assignee_id: string | null;
          expected_close_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_name: string;
          deal_name?: string;
          stage?: Database["public"]["Enums"]["deal_stage"];
          amount?: number;
          probability?: number;
          next_action?: string;
          assignee_id?: string | null;
          expected_close_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_name?: string;
          deal_name?: string;
          stage?: Database["public"]["Enums"]["deal_stage"];
          amount?: number;
          probability?: number;
          next_action?: string;
          assignee_id?: string | null;
          expected_close_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "green_deals_assignee_id_fkey";
            columns: ["assignee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      local_projects: {
        Row: {
          id: string;
          title: string;
          area: string;
          partner: string;
          status: Database["public"]["Enums"]["local_project_status"];
          summary: string;
          image_url: string | null;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          area?: string;
          partner?: string;
          status?: Database["public"]["Enums"]["local_project_status"];
          summary?: string;
          image_url?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          area?: string;
          partner?: string;
          status?: Database["public"]["Enums"]["local_project_status"];
          summary?: string;
          image_url?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      meeting_rooms: {
        Row: {
          id: string;
          name: string;
          description: string;
          default_url: string;
          status: Database["public"]["Enums"]["room_status"];
          visible_roles: Database["public"]["Enums"]["user_role"][];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          default_url?: string;
          status?: Database["public"]["Enums"]["room_status"];
          visible_roles?: Database["public"]["Enums"]["user_role"][];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          default_url?: string;
          status?: Database["public"]["Enums"]["room_status"];
          visible_roles?: Database["public"]["Enums"]["user_role"][];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      meetings: {
        Row: {
          id: string;
          title: string;
          meeting_room_id: string | null;
          start_at: string;
          end_at: string;
          meeting_url: string | null;
          client_name: string;
          host_id: string | null;
          status: Database["public"]["Enums"]["meeting_status"];
          visible_roles: Database["public"]["Enums"]["user_role"][];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          meeting_room_id?: string | null;
          start_at: string;
          end_at: string;
          meeting_url?: string | null;
          client_name?: string;
          host_id?: string | null;
          status?: Database["public"]["Enums"]["meeting_status"];
          visible_roles?: Database["public"]["Enums"]["user_role"][];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          meeting_room_id?: string | null;
          start_at?: string;
          end_at?: string;
          meeting_url?: string | null;
          client_name?: string;
          host_id?: string | null;
          status?: Database["public"]["Enums"]["meeting_status"];
          visible_roles?: Database["public"]["Enums"]["user_role"][];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meetings_host_id_fkey";
            columns: ["host_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meetings_meeting_room_id_fkey";
            columns: ["meeting_room_id"];
            isOneToOne: false;
            referencedRelation: "meeting_rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      next_actions: {
        Row: {
          id: string;
          title: string;
          project_id: string | null;
          assignee_id: string | null;
          due_at: string | null;
          status: Database["public"]["Enums"]["action_status"];
          priority: Database["public"]["Enums"]["action_priority"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          project_id?: string | null;
          assignee_id?: string | null;
          due_at?: string | null;
          status?: Database["public"]["Enums"]["action_status"];
          priority?: Database["public"]["Enums"]["action_priority"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          project_id?: string | null;
          assignee_id?: string | null;
          due_at?: string | null;
          status?: Database["public"]["Enums"]["action_status"];
          priority?: Database["public"]["Enums"]["action_priority"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "next_actions_assignee_id_fkey";
            columns: ["assignee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "next_actions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          name: string;
          email: string;
          role: Database["public"]["Enums"]["user_role"];
          position: string;
          department: Database["public"]["Enums"]["department_key"];
          status: Database["public"]["Enums"]["user_status"];
          avatar_url: string | null;
          bio: string;
          today_schedule: string;
          is_public: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          // No column default: profiles.id must equal auth.users.id.
          id: string;
          name: string;
          email: string;
          role?: Database["public"]["Enums"]["user_role"];
          position?: string;
          department?: Database["public"]["Enums"]["department_key"];
          status?: Database["public"]["Enums"]["user_status"];
          avatar_url?: string | null;
          bio?: string;
          today_schedule?: string;
          is_public?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          role?: Database["public"]["Enums"]["user_role"];
          position?: string;
          department?: Database["public"]["Enums"]["department_key"];
          status?: Database["public"]["Enums"]["user_status"];
          avatar_url?: string | null;
          bio?: string;
          today_schedule?: string;
          is_public?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          title: string;
          client_name: string;
          business_section: Database["public"]["Enums"]["section_key"];
          status: Database["public"]["Enums"]["project_status"];
          description: string;
          assignee_id: string | null;
          progress: number;
          due_date: string | null;
          amount: number;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          client_name?: string;
          business_section: Database["public"]["Enums"]["section_key"];
          status?: Database["public"]["Enums"]["project_status"];
          description?: string;
          assignee_id?: string | null;
          progress?: number;
          due_date?: string | null;
          amount?: number;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          client_name?: string;
          business_section?: Database["public"]["Enums"]["section_key"];
          status?: Database["public"]["Enums"]["project_status"];
          description?: string;
          assignee_id?: string | null;
          progress?: number;
          due_date?: string | null;
          amount?: number;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_assignee_id_fkey";
            columns: ["assignee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      section_metrics: {
        Row: {
          id: string;
          section_key: Database["public"]["Enums"]["section_key"];
          metric_key: string;
          label: string;
          value: string;
          unit: string;
          comparison_value: string | null;
          comparison_label: string | null;
          display_order: number;
          visible_roles: Database["public"]["Enums"]["user_role"][];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          section_key: Database["public"]["Enums"]["section_key"];
          metric_key: string;
          label: string;
          value?: string;
          unit?: string;
          comparison_value?: string | null;
          comparison_label?: string | null;
          display_order?: number;
          visible_roles?: Database["public"]["Enums"]["user_role"][];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          section_key?: Database["public"]["Enums"]["section_key"];
          metric_key?: string;
          label?: string;
          value?: string;
          unit?: string;
          comparison_value?: string | null;
          comparison_label?: string | null;
          display_order?: number;
          visible_roles?: Database["public"]["Enums"]["user_role"][];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      table_menu_items: {
        Row: {
          id: string;
          store_name: string;
          name: string;
          category: string;
          price: number;
          sales_count: number;
          image_url: string | null;
          is_active: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_name: string;
          name: string;
          category?: string;
          price?: number;
          sales_count?: number;
          image_url?: string | null;
          is_active?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_name?: string;
          name?: string;
          category?: string;
          price?: number;
          sales_count?: number;
          image_url?: string | null;
          is_active?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      table_store_metrics: {
        Row: {
          id: string;
          store_name: string;
          business_date: string;
          sales: number;
          customers: number;
          average_spend: number;
          store_status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_name: string;
          business_date: string;
          sales?: number;
          customers?: number;
          average_spend?: number;
          store_status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_name?: string;
          business_date?: string;
          sales?: number;
          customers?: number;
          average_spend?: number;
          store_status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      action_priority: "low" | "medium" | "high";
      action_status: "todo" | "doing" | "done";
      announcement_priority: "normal" | "important" | "urgent";
      deal_stage:
        | "lead"
        | "meeting"
        | "proposal"
        | "negotiation"
        | "won"
        | "lost";
      department_key:
        | "LOCAL"
        | "SIGNAL"
        | "PARTNER"
        | "TABLE"
        | "GREEN"
        | "MANAGEMENT"
        | "OTHER";
      local_project_status: "planning" | "active" | "completed";
      meeting_status: "scheduled" | "in_progress" | "done" | "cancelled";
      project_status: "planning" | "active" | "review" | "completed" | "paused";
      room_status: "available" | "reserved" | "in_use";
      section_key: "LOCAL" | "SIGNAL" | "PARTNER" | "TABLE" | "GREEN";
      user_role: "guest" | "member" | "admin";
      user_status: "online" | "away" | "meeting" | "offline";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

export type TableName = keyof Database["public"]["Tables"];

export type Tables<T extends TableName> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends TableName> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends TableName> =
  Database["public"]["Tables"][T]["Update"];

export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];

export type UserRole = Enums<"user_role">;
export type SectionKey = Enums<"section_key">;
