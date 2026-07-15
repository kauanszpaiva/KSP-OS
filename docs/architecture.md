# Architecture Overview

KSP Dominion Command OS is a modular monolith. Next.js handles UI, route guards, and server commands. Domain packages hold business invariants. Supabase Postgres is the source of record with Row Level Security for every exposed table. Supabase Auth provides identity; Storage is private-by-default with signed URL flows to be implemented per document/media vertical slice. Vercel hosts Local/Preview/Staging/Production deployments with separate Supabase backends for Staging and Production.
