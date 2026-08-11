from dotenv import load_dotenv

# Must run before any submodule import (e.g. app.workflow.graph pulls in
# langgraph, which reads LANGGRAPH_STRICT_MSGPACK from os.environ at import
# time). Importing anything under the `app` package runs this first.
load_dotenv()
