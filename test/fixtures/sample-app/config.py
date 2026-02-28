import os
db = os.environ['DATABASE_URL']
secret = os.environ.get('PYTHON_SECRET', 'fallback')
api = os.getenv('API_KEY')
unused_only_python = os.getenv('ONLY_IN_PYTHON')
