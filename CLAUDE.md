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

### Convex Actions and External APIs

- **Rule**: Never have Convex actions call localhost APIs - they run in the cloud
- **Context**: Convex actions execute in Convex's cloud environment, not locally. They cannot access localhost endpoints
- **Solution**: For external API calls (like OpenAI), make them directly from the Convex action using `"use node"` directive and environment variables
- **Example**: Instead of Convex → localhost:3000/api → OpenAI, use Convex → OpenAI directly with `process.env.OPENAI_API_KEY`

### Convex Vector Search Limitations

- **Rule**: Always fetch full documents after vector search - results only contain `_id` and `_score`
- **Context**: Convex vector search returns only document IDs and similarity scores, not the full document fields
- **Solution**: After vector search, use `ctx.db.get(id)` or create an internal query to fetch full documents by ID
- **Example**: `const doc = await ctx.runQuery(internal.table.getById, { id: result._id })`

### Convex Vector Search Array Filtering

- **Rule**: Never filter by array fields in Convex vector search - use post-filtering instead
- **Context**: Convex vector search filters don't support array field operations (checking if array contains value)
- **Solution**: Get more results from vector search (e.g., limit: 100), fetch full documents, then filter arrays in JavaScript
- **Example**: Instead of `filter: (q) => q.eq('industries', 'AI')` on array field → fetch results then `filter(doc => doc.industries.includes('AI'))`

### Next.js Edge Runtime Import Paths

- **Rule**: Use relative paths instead of `@/` alias when importing Convex schemas in Next.js API routes with edge runtime
- **Context**: Edge runtime may have issues resolving TypeScript path aliases like `@/convex`
- **Solution**: Use relative imports like `../../../../convex/lib/schema` instead of `@/convex/lib/schema`
- **Example**: In `/src/app/api/route.ts`, import from `../../../../convex` not `@/convex`

### Frontend-Database Value Matching

- **Rule**: Always verify that frontend constant values match exact database values before debugging "no results" issues
- **Context**: Frontend often uses simplified display values that don't match database field values, causing filters to return 0 results
- **Solution**: Run database queries to check actual field values, then ensure frontend constants match exactly
- **Example**: Frontend "Consumer" vs Database "Consumer Internet & Commerce" - use `npx convex run table:debugQuery` to check actual values

# IMPORTANT If you ever start processes, make sure to always kill them before the end of the conversation.
