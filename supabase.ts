import { createClient } from '@supabase/supabase-js'

// Supabase yapılandırması
// Bu bilgileri Supabase dashboard'unuzdan alacaksınız
const supabaseUrl = 'https://caodtncpzfzkoqyjdwga.supabase.co' // Buraya Supabase URL'nizi ekleyeceksiniz
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhb2R0bmNwemZ6a29xeWpkd2dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2NDUxNDIsImV4cCI6MjA3NjIyMTE0Mn0.PQ_1qqpKnYAbADhSMHck_U9XnLoFj0zagcfY5oKE1GE' // Buraya Supabase anahtarınızı ekleyeceksiniz

export const supabase = createClient(supabaseUrl, supabaseKey)

// Veritabanı tipleri
export type DatabaseBackup = {
  id: string
  name: string
  data: any // JSON verisi
  created_at: string
}

// Supabase tablo yapısı:
// CREATE TABLE program_backups (
//   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//   name TEXT NOT NULL,
//   data JSONB NOT NULL,
//   created_at TIMESTAMP DEFAULT NOW()
// );