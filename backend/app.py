from dotenv import load_dotenv
load_dotenv()
import os
from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from functools import wraps
import datetime
from pymongo import MongoClient
from bson.objectid import ObjectId
from werkzeug.security import generate_password_hash, check_password_hash

# --- MongoDB Atlas Connection ---
MONGO_URI = os.getenv('MONGO_URI')
client = MongoClient(MONGO_URI)
db = client['ProdSmart']
users_col = db['users']
tasks_col = db['tasks']
reminders_col = db['reminders']
notes_col = db['notes']
schedules_col = db['schedules']
notifications_col = db['notifications']

app = Flask(__name__)
# Enable CORS for frontend at http://localhost:5500 with credentials
CORS(app, supports_credentials=True, origins=["http://localhost:5500"])
app.secret_key = os.environ.get('SECRET_KEY', 'prodsmart-secret-key')
# Ensure session cookie is sent cross-origin for local dev
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'  # Use 'None' if using HTTPS
app.config['SESSION_COOKIE_SECURE'] = False    # True if using HTTPS
app.config['SESSION_COOKIE_DOMAIN'] = 'localhost'

# --- Helper: Auth Decorator ---
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        return f(user_id, *args, **kwargs)
    return decorated

# --- Helper: Find user by email ---
def find_user_by_email(email):
    return users_col.find_one({'email': email})

# --- Auth Endpoints ---
@app.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.json or {}  # Always default to dict
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')
    if not email or not password or not name:
        return jsonify({'error': 'Missing fields'}), 400
    if find_user_by_email(email):
        return jsonify({'error': 'Email already exists'}), 409
    # --- Password hashing for production ---
    hashed_pw = generate_password_hash(password)
    user = {
        'email': email,
        'password': hashed_pw,
        'name': name
    }
    result = users_col.insert_one(user)
    user_id = str(result.inserted_id)
    session['user_id'] = user_id
    return jsonify({'id': user_id, 'email': email, 'name': name}), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json or {}  # Always default to dict
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify({'error': 'Missing fields'}), 400
    user = find_user_by_email(email)
    if not user:
        return jsonify({'error': 'USER_NOT_FOUND'}), 404
    if not check_password_hash(user['password'], password):
        return jsonify({'error': 'INVALID_PASSWORD'}), 401
    session['user_id'] = str(user['_id'])
    return jsonify({'id': str(user['_id']), 'email': user['email'], 'name': user['name']}), 200

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return jsonify({'message': 'Logged out'}), 200

@app.route('/api/auth/session', methods=['GET'])
def check_session():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'authenticated': False}), 200
    user = users_col.find_one({'_id': ObjectId(user_id)})
    if not user:
        return jsonify({'authenticated': False}), 200
    return jsonify({'authenticated': True, 'user': {'id': str(user['_id']), 'email': user['email'], 'name': user['name']}}), 200

# --- CRUD Endpoints for Each Resource ---
# --- Tasks ---
@app.route('/api/tasks', methods=['GET'])
@login_required
def get_tasks(user_id):
    tasks = list(tasks_col.find({'user_id': user_id}))
    for t in tasks:
        t['id'] = str(t['_id'])
        del t['_id']
    return jsonify(tasks), 200

@app.route('/api/tasks', methods=['POST'])
@login_required
def add_task(user_id):
    data = request.json or {}  # Always default to dict
    text = data.get('text')
    if not text:
        return jsonify({'error': 'Task text required'}), 400
    task = {
        'user_id': user_id,
        'text': text,
        'completed': False,
        'date': data.get('date', datetime.datetime.now().isoformat())
    }
    result = tasks_col.insert_one(task)
    task['id'] = str(result.inserted_id)
    return jsonify(task), 201

@app.route('/api/tasks/<task_id>', methods=['PUT'])
@login_required
def update_task(user_id, task_id):
    data = request.json or {}  # Always default to dict
    update_dict = {k: v for k, v in data.items() if k in ['text', 'completed', 'date']}
    result = tasks_col.update_one({'_id': ObjectId(task_id), 'user_id': user_id}, {'$set': update_dict})
    if result.matched_count == 0:
        return jsonify({'error': 'Task not found'}), 404
    task = tasks_col.find_one({'_id': ObjectId(task_id)})
    if not task:
        return jsonify({'error': 'Task not found'}), 404
    task['id'] = str(task['_id'])
    del task['_id']
    return jsonify(task), 200

@app.route('/api/tasks/<task_id>', methods=['DELETE'])
@login_required
def delete_task(user_id, task_id):
    result = tasks_col.delete_one({'_id': ObjectId(task_id), 'user_id': user_id})
    if result.deleted_count == 0:
        return jsonify({'error': 'Task not found'}), 404
    return jsonify({'message': 'Task deleted'}), 200

@app.route('/api/tasks', methods=['DELETE'])
@login_required
def delete_all_tasks(user_id):
    tasks_col.delete_many({'user_id': user_id})
    return jsonify({'message': 'All tasks deleted'}), 200

# --- Reminders ---
@app.route('/api/reminders', methods=['GET'])
@login_required
def get_reminders(user_id):
    reminders = list(reminders_col.find({'user_id': user_id}))
    for r in reminders:
        r['id'] = str(r['_id'])
        del r['_id']
    return jsonify(reminders), 200

@app.route('/api/reminders', methods=['POST'])
@login_required
def add_reminder(user_id):
    data = request.json or {}  # Always default to dict
    title = data.get('title')
    date = data.get('date')
    time = data.get('time')
    if not title or not date or not time:
        return jsonify({'error': 'Missing fields'}), 400
    reminder = {
        'user_id': user_id,
        'title': title,
        'date': date,
        'time': time,
        'notified': False
    }
    result = reminders_col.insert_one(reminder)
    reminder['id'] = str(result.inserted_id)
    return jsonify(reminder), 201

@app.route('/api/reminders/<reminder_id>', methods=['PUT'])
@login_required
def update_reminder(user_id, reminder_id):
    data = request.json or {}  # Always default to dict
    update_dict = {k: v for k, v in data.items() if k in ['title', 'date', 'time', 'notified']}
    result = reminders_col.update_one({'_id': ObjectId(reminder_id), 'user_id': user_id}, {'$set': update_dict})
    if result.matched_count == 0:
        return jsonify({'error': 'Reminder not found'}), 404
    reminder = reminders_col.find_one({'_id': ObjectId(reminder_id)})
    if not reminder:
        return jsonify({'error': 'Reminder not found'}), 404
    reminder['id'] = str(reminder['_id'])
    del reminder['_id']
    return jsonify(reminder), 200

@app.route('/api/reminders/<reminder_id>', methods=['DELETE'])
@login_required
def delete_reminder(user_id, reminder_id):
    result = reminders_col.delete_one({'_id': ObjectId(reminder_id), 'user_id': user_id})
    if result.deleted_count == 0:
        return jsonify({'error': 'Reminder not found'}), 404
    return jsonify({'message': 'Reminder deleted'}), 200

@app.route('/api/reminders', methods=['DELETE'])
@login_required
def delete_all_reminders(user_id):
    reminders_col.delete_many({'user_id': user_id})
    return jsonify({'message': 'All reminders deleted'}), 200

# --- Notes ---
@app.route('/api/notes', methods=['GET'])
@login_required
def get_notes(user_id):
    notes = list(notes_col.find({'user_id': user_id}))
    for n in notes:
        n['id'] = str(n['_id'])
        del n['_id']
    return jsonify(notes), 200

@app.route('/api/notes', methods=['POST'])
@login_required
def add_note(user_id):
    data = request.json or {}  # Always default to dict
    title = data.get('title')
    content = data.get('content')
    attachments = data.get('attachments', [])  # Default to empty list
    if not title and (not content or content == '<p><br></p>') and not attachments:
        return jsonify({'error': 'Note must have title, content, or attachment'}), 400
    note = {
        'user_id': user_id,
        'title': title,
        'content': content,
        'attachments': attachments
    }
    result = notes_col.insert_one(note)
    note['id'] = str(result.inserted_id)
    return jsonify(note), 201

@app.route('/api/notes/<note_id>', methods=['PUT'])
@login_required
def update_note(user_id, note_id):
    data = request.json or {}  # Always default to dict
    update_dict = {k: v for k, v in data.items() if k in ['title', 'content', 'attachments']}
    result = notes_col.update_one({'_id': ObjectId(note_id), 'user_id': user_id}, {'$set': update_dict})
    if result.matched_count == 0:
        return jsonify({'error': 'Note not found'}), 404
    note = notes_col.find_one({'_id': ObjectId(note_id)})
    if not note:
        return jsonify({'error': 'Note not found'}), 404
    note['id'] = str(note['_id'])
    del note['_id']
    return jsonify(note), 200

@app.route('/api/notes/<note_id>', methods=['DELETE'])
@login_required
def delete_note(user_id, note_id):
    result = notes_col.delete_one({'_id': ObjectId(note_id), 'user_id': user_id})
    if result.deleted_count == 0:
        return jsonify({'error': 'Note not found'}), 404
    return jsonify({'message': 'Note deleted'}), 200

@app.route('/api/notes', methods=['DELETE'])
@login_required
def delete_all_notes(user_id):
    notes_col.delete_many({'user_id': user_id})
    return jsonify({'message': 'All notes deleted'}), 200

# --- Schedules (Learning Hub) ---
@app.route('/api/schedules', methods=['GET'])
@login_required
def get_schedules(user_id):
    schedules = list(schedules_col.find({'user_id': user_id}))
    for s in schedules:
        s['id'] = str(s['_id'])
        del s['_id']
    return jsonify(schedules), 200

@app.route('/api/schedules', methods=['POST'])
@login_required
def add_schedule(user_id):
    data = request.json or {}  # Always default to dict
    lesson = data.get('lesson')
    date = data.get('date')
    time = data.get('time')
    if not lesson or not date or not time:
        return jsonify({'error': 'Missing fields'}), 400
    schedule = {
        'user_id': user_id,
        'lesson': lesson,
        'date': date,
        'time': time,
        'notified': False,
        'completed': False
    }
    result = schedules_col.insert_one(schedule)
    schedule['id'] = str(result.inserted_id)
    return jsonify(schedule), 201

@app.route('/api/schedules/<schedule_id>', methods=['PUT'])
@login_required
def update_schedule(user_id, schedule_id):
    data = request.json or {}  # Always default to dict
    update_dict = {k: v for k, v in data.items() if k in ['lesson', 'date', 'time', 'notified', 'completed']}
    result = schedules_col.update_one({'_id': ObjectId(schedule_id), 'user_id': user_id}, {'$set': update_dict})
    if result.matched_count == 0:
        return jsonify({'error': 'Schedule not found'}), 404
    schedule = schedules_col.find_one({'_id': ObjectId(schedule_id)})
    if not schedule:
        return jsonify({'error': 'Schedule not found'}), 404
    schedule['id'] = str(schedule['_id'])
    del schedule['_id']
    return jsonify(schedule), 200

@app.route('/api/schedules/<schedule_id>', methods=['DELETE'])
@login_required
def delete_schedule(user_id, schedule_id):
    result = schedules_col.delete_one({'_id': ObjectId(schedule_id), 'user_id': user_id})
    if result.deleted_count == 0:
        return jsonify({'error': 'Schedule not found'}), 404
    return jsonify({'message': 'Schedule deleted'}), 200

@app.route('/api/schedules', methods=['DELETE'])
@login_required
def delete_all_schedules(user_id):
    schedules_col.delete_many({'user_id': user_id})
    return jsonify({'message': 'All schedules deleted'}), 200

# --- Notifications ---
@app.route('/api/notifications', methods=['GET'])
@login_required
def get_notifications(user_id):
    notifications = list(notifications_col.find({'user_id': user_id}))
    for n in notifications:
        n['id'] = str(n['_id'])
        del n['_id']
    return jsonify(notifications), 200

@app.route('/api/notifications', methods=['POST'])
@login_required
def add_notification(user_id):
    data = request.json or {}  # Always default to dict
    notification = {
        'user_id': user_id,
        'title': data.get('title'),
        'description': data.get('description'),
        'source': data.get('source'),
        'timestamp': datetime.datetime.now().isoformat()
    }
    result = notifications_col.insert_one(notification)
    notification['id'] = str(result.inserted_id)
    return jsonify(notification), 201

@app.route('/api/notifications/<notification_id>', methods=['DELETE'])
@login_required
def delete_notification(user_id, notification_id):
    result = notifications_col.delete_one({'_id': ObjectId(notification_id), 'user_id': user_id})
    if result.deleted_count == 0:
        return jsonify({'error': 'Notification not found'}), 404
    return jsonify({'message': 'Notification deleted'}), 200

@app.route('/api/notifications', methods=['DELETE'])
@login_required
def delete_all_notifications(user_id):
    notifications_col.delete_many({'user_id': user_id})
    return jsonify({'message': 'All notifications deleted'}), 200

# --- Serve login.html at root ---
@app.route('/')
def root():
    return send_from_directory('.', 'login.html')

@app.route('/signup')
def serve_signup():
    return send_from_directory('.', 'signup.html')

@app.route('/api/cors-test', methods=['GET', 'POST'])
def cors_test():
    return jsonify({'message': 'CORS is working!'})

# --- Main ---
if __name__ == '__main__':
    # Configurable port and debug
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', '1') == '1'
    app.run(host='0.0.0.0', port=port, debug=debug)