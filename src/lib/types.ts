export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  printkit: {
    Tables: {
      admin_audit: {
        Row: {
          action: string;
          admin_id: string;
          created_at: string;
          detail: Json | null;
          id: string;
          target_id: string | null;
        };
        Insert: {
          action: string;
          admin_id: string;
          created_at?: string;
          detail?: Json | null;
          id?: string;
          target_id?: string | null;
        };
        Update: {
          action?: string;
          admin_id?: string;
          created_at?: string;
          detail?: Json | null;
          id?: string;
          target_id?: string | null;
        };
        Relationships: [];
      };
      admins: {
        Row: {
          created_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      kit_api_keys: {
        Row: {
          callback_secret: string | null;
          callback_url: string | null;
          created_at: string;
          kit_slug: string;
          secret_hash: string;
        };
        Insert: {
          callback_secret?: string | null;
          callback_url?: string | null;
          created_at?: string;
          kit_slug: string;
          secret_hash: string;
        };
        Update: {
          callback_secret?: string | null;
          callback_url?: string | null;
          created_at?: string;
          kit_slug?: string;
          secret_hash?: string;
        };
        Relationships: [];
      };
      legal_check_state: {
        Row: {
          checked_at: string;
          email: string;
          is_current: boolean;
        };
        Insert: {
          checked_at?: string;
          email: string;
          is_current: boolean;
        };
        Update: {
          checked_at?: string;
          email?: string;
          is_current?: boolean;
        };
        Relationships: [];
      };
      print_batches: {
        Row: {
          id: string;
          vendor_id: string;
          source_kit: string;
          source_ref: string;
          payload: Json;
          labels: Json;
          status: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          source_kit: string;
          source_ref: string;
          payload: Json;
          labels: Json;
          status?: string;
          updated_at?: string;
        };
        Update: { status?: string; updated_at?: string };
        Relationships: [];
      };
      print_jobs: {
        Row: {
          batch_id: string | null;
          created_at: string;
          driver_ref: string | null;
          failure_reason: string | null;
          id: string;
          job_type: string;
          location_id: string | null;
          payload: Json;
          printed_at: string | null;
          requeued_at: string | null;
          sent_at: string | null;
          source_kit: string;
          source_ref: string;
          status: string;
          vendor_id: string;
        };
        Insert: {
          batch_id?: string | null;
          created_at?: string;
          driver_ref?: string | null;
          failure_reason?: string | null;
          id?: string;
          job_type?: string;
          location_id?: string | null;
          payload: Json;
          printed_at?: string | null;
          requeued_at?: string | null;
          sent_at?: string | null;
          source_kit: string;
          source_ref: string;
          status?: string;
          vendor_id: string;
        };
        Update: {
          batch_id?: string | null;
          created_at?: string;
          driver_ref?: string | null;
          failure_reason?: string | null;
          id?: string;
          job_type?: string;
          location_id?: string | null;
          payload?: Json;
          printed_at?: string | null;
          requeued_at?: string | null;
          sent_at?: string | null;
          source_kit?: string;
          source_ref?: string;
          status?: string;
          vendor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "print_jobs_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: true;
            referencedRelation: "print_locations";
            referencedColumns: ["id"];
          },
        ];
      };
      printers: {
        Row: {
          catalog_id: string;
          connector: string;
          created_at: string;
          device_ref: string | null;
          display_name: string;
          driver: string;
          id: string;
          label_height_mm: number;
          label_width_mm: number;
          last_seen_at: string | null;
          location_id: string;
          vendor_id: string;
        };
        Insert: {
          catalog_id: string;
          connector: string;
          created_at?: string;
          device_ref?: string | null;
          display_name: string;
          driver: string;
          id?: string;
          label_height_mm: number;
          label_width_mm: number;
          last_seen_at?: string | null;
          location_id: string;
          vendor_id: string;
        };
        Update: {
          catalog_id?: string;
          connector?: string;
          created_at?: string;
          device_ref?: string | null;
          display_name?: string;
          driver?: string;
          id?: string;
          label_height_mm?: number;
          label_width_mm?: number;
          last_seen_at?: string | null;
          location_id?: string;
          vendor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "printers_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: true;
            referencedRelation: "print_locations";
            referencedColumns: ["id"];
          },
        ];
      };
      device_credentials: {
        Row: {
          created_at: string;
          kind: string;
          printer_id: string;
          rotated_at: string | null;
          token_hash: string;
        };
        Insert: {
          created_at?: string;
          kind: string;
          printer_id: string;
          rotated_at?: string | null;
          token_hash: string;
        };
        Update: {
          created_at?: string;
          kind?: string;
          printer_id?: string;
          rotated_at?: string | null;
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "device_credentials_printer_id_fkey";
            columns: ["printer_id"];
            isOneToOne: true;
            referencedRelation: "printers";
            referencedColumns: ["id"];
          },
        ];
      };
      bridge_pairing_codes: {
        Row: {
          code_hash: string;
          expires_at: string;
          printer_id: string;
          used_at: string | null;
        };
        Insert: {
          code_hash: string;
          expires_at: string;
          printer_id: string;
          used_at?: string | null;
        };
        Update: {
          code_hash?: string;
          expires_at?: string;
          printer_id?: string;
          used_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "bridge_pairing_codes_printer_id_fkey";
            columns: ["printer_id"];
            isOneToOne: false;
            referencedRelation: "printers";
            referencedColumns: ["id"];
          },
        ];
      };
      print_locations: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          label: string;
          source_kit: string;
          source_ref: string;
          vendor_id: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          id?: string;
          label: string;
          source_kit: string;
          source_ref: string;
          vendor_id: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          label?: string;
          source_kit?: string;
          source_ref?: string;
          vendor_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_label_batch: {
        Args: {
          p_vendor_id: string;
          p_source_kit: string;
          p_source_ref: string;
          p_payload: Json;
          p_labels: Json;
          p_location_id: string | null;
        };
        Returns: { id: string; job_ids: string[] }[];
      };
      label_batch_status: {
        Args: { p_batch_id: string };
        Returns: {
          source_kit: string;
          source_ref: string;
          status: string;
          updated_at: string;
        }[];
      };
      is_admin: { Args: { p_uid: string }; Returns: boolean };
      claim_cloud_poll_job: {
        Args: {
          p_location_id: string;
          p_job_id: string;
          p_created_at: string;
          p_requeued_at: string | null;
        };
        Returns: Database["printkit"]["Tables"]["print_jobs"]["Row"][];
      };
      claim_job: {
        Args: { p_location_id: string; p_job_id?: string | null };
        Returns: Database["printkit"]["Tables"]["print_jobs"]["Row"][];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
