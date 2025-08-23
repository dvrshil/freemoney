# Claude Code Instructions

## Failure Mode Prevention Rules

### Large Data File Handling
- **Rule**: Always check file size before using the Read tool for data files (JSON, CSV, etc.)
- **Context**: The Read tool has a 256KB limit. Attempting to read large data files (>256KB) will fail
- **Solution**: For large data files, use bash commands (`head`, `tail`, `wc -l`) to sample the file structure, then use Python scripts for full analysis
- **Example**: Instead of `Read` on large JSON → use `head -n 100 file.json` to understand structure, then write Python script for analysis

### Python Environment Management
- **Rule**: Always create virtual environments before installing packages for Python scripts
- **Context**: macOS and many Linux systems have externally-managed Python environments that prevent direct pip installs
- **Solution**: Use `python3 -m venv venv_name && source venv_name/bin/activate && pip install package` instead of `pip3 install package`
- **Example**: Before running scripts that import `requests`, `pandas`, etc., create virtual environment first

### JSON Data Structure Analysis
- **Rule**: Always examine actual JSON structure before assuming field locations
- **Context**: JSON APIs often nest important fields in sub-objects rather than at the top level
- **Solution**: Use `head -n 50 file.json` or write a small Python script to explore structure before accessing fields
- **Example**: Check if `personal_twitter_profile` is in root object or `enrichment` sub-object before writing access code

### Complex Python Commands in Bash
- **Rule**: Avoid complex multi-line Python commands with f-strings in `bash -c` calls
- **Context**: Complex Python syntax (especially f-strings with quotes) often causes syntax errors in single-line bash commands  
- **Solution**: Write separate `.py` files for any Python logic beyond simple one-liners
- **Example**: Instead of `python3 -c "complex_code_with_fstrings"` → create `analyze.py` file and run `python3 analyze.py`

### Next.js/Convex Environment Variables
- **Rule**: Always load both `.env` and `.env.local` files when writing Node.js scripts for Next.js/Convex projects
- **Context**: Next.js projects split environment variables between `.env` (general) and `.env.local` (deployment-specific). Convex URLs are in `.env.local`, API keys often in `.env`
- **Solution**: Use `dotenv.config()` followed by `dotenv.config({ path: '.env.local' })` to load both files
- **Example**: Scripts accessing both `OPENAI_API_KEY` and `NEXT_PUBLIC_CONVEX_URL` need both env files loaded