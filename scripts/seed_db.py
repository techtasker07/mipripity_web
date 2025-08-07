import os
import psycopg2
from faker import Faker
from datetime import datetime, timedelta
import random
from dotenv import load_dotenv

# Load environment variables from .env file (if running locally)
load_dotenv()

# Database configuration from environment variables
DB_HOST = os.getenv('DB_HOST')
DB_PORT = os.getenv('DB_PORT')
DB_NAME = os.getenv('DB_NAME')
DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_EXTERNAL_URL = os.getenv('DB_EXTERNAL_URL') # Use this for Render deployment

# Use DB_EXTERNAL_URL if available, otherwise construct from individual parts
DATABASE_URL = DB_EXTERNAL_URL if DB_EXTERNAL_URL else f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

fake = Faker()

def get_db_connection():
    conn = psycopg2.connect(DATABASE_URL)
    return conn

def seed_data():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        print("Seeding data...")

        # Clear existing data (optional, for fresh start)
        cur.execute("TRUNCATE TABLE votes, property_images, properties, prospect_properties, vote_options, categories, users RESTART IDENTITY CASCADE;")
        print("Cleared existing data.")

        # 1. Seed Users
        users = []
        for _ in range(10):
            first_name = fake.first_name()
            last_name = fake.last_name()
            email = fake.unique.email()
            password_hash = "Password1" # Using a simple password as requested
            phone_number = fake.phone_number()
            cur.execute(
                "INSERT INTO users (first_name, last_name, email, password_hash, phone_number) VALUES (%s, %s, %s, %s, %s) RETURNING id;",
                (first_name, last_name, email, password_hash, phone_number)
            )
            user_id = cur.fetchone()[0]
            users.append({'id': user_id, 'first_name': first_name, 'last_name': last_name, 'email': email, 'phone_number': phone_number})
        print(f"Seeded {len(users)} users.")

        # 2. Seed Categories
        categories_data = [
            {'name': 'Residential'},
            {'name': 'Commercial'},
            {'name': 'Land'},
            {'name': 'Material'}
        ]
        categories = []
        for cat in categories_data:
            cur.execute("INSERT INTO categories (name) VALUES (%s) RETURNING id;", (cat['name'],))
            category_id = cur.fetchone()[0]
            categories.append({'id': category_id, 'name': cat['name']})
        print(f"Seeded {len(categories)} categories.")

        # 3. Seed Vote Options
        vote_options = []
        for category in categories:
            if category['name'] == 'Residential':
                options = ['Buy', 'Rent', 'Sell', 'Hold']
            elif category['name'] == 'Commercial':
                options = ['Invest', 'Lease', 'Develop', 'Liquidate']
            elif category['name'] == 'Land':
                options = ['Develop', 'Farm', 'Preserve', 'Sell']
            elif category['name'] == 'Material':
                options = ['Acquire', 'Dispose', 'Recycle', 'Store']
            else:
                options = ['Yes', 'No', 'Maybe'] # Fallback

            for opt_name in options:
                cur.execute(
                    "INSERT INTO vote_options (name, category_id) VALUES (%s, %s) RETURNING id;",
                    (opt_name, category['id'])
                )
                vote_option_id = cur.fetchone()[0]
                vote_options.append({'id': vote_option_id, 'name': opt_name, 'category_id': category['id']})
        print(f"Seeded {len(vote_options)} vote options.")

        # 4. Seed Properties
        properties = []
        for _ in range(30): # Create 30 properties
            user = random.choice(users)
            category = random.choice(categories)
            title = fake.sentence(nb_words=5)
            description = fake.paragraph(nb_sentences=5)
            location = fake.address()
            current_worth = round(random.uniform(50000, 5000000), 2)
            year_of_construction = random.randint(1900, datetime.now().year)
            
            cur.execute(
                """INSERT INTO properties (title, description, location, user_id, category_id, current_worth, year_of_construction)
                   VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id;""",
                (title, description, location, user['id'], category['id'], current_worth, year_of_construction)
            )
            property_id = cur.fetchone()[0]
            properties.append({'id': property_id, 'user_id': user['id'], 'category_id': category['id']})

            # Add images for properties
            for i in range(random.randint(1, 3)): # 1 to 3 images per property
                image_url = f"https://picsum.photos/seed/{fake.uuid4()}/800/600"
                is_primary = (i == 0)
                cur.execute(
                    "INSERT INTO property_images (property_id, image_url, is_primary) VALUES (%s, %s, %s);",
                    (property_id, image_url, is_primary)
                )
        print(f"Seeded {len(properties)} properties with images.")

        # 5. Seed Votes
        for _ in range(100): # Create 100 votes
            user = random.choice(users)
            property = random.choice(properties)
            
            # Ensure vote option matches property's category
            available_options = [opt for opt in vote_options if opt['category_id'] == property['category_id']]
            if not available_options:
                continue # Skip if no options for this category

            vote_option = random.choice(available_options)

            try:
                cur.execute(
                    "INSERT INTO votes (user_id, property_id, vote_option_id) VALUES (%s, %s, %s);",
                    (user['id'], property['id'], vote_option['id'])
                )
            except psycopg2.IntegrityError:
                conn.rollback() # Rollback if user already voted for this property
                continue # Try with another random user/property
        print("Seeded 100 votes.")

        # 6. Seed Prospect Properties (200 per category)
        prospect_properties_count = 0
        for category in categories:
            for _ in range(200): # 200 prospects per category
                title = fake.sentence(nb_words=6) + " (Prospect)"
                description = fake.paragraph(nb_sentences=6)
                location = fake.address()
                estimated_worth = round(random.uniform(100000, 10000000), 2)
                year_of_construction = random.randint(1850, datetime.now().year + 5) # Can be future for prospects
                image_url = f"https://picsum.photos/seed/{fake.uuid4()}/1200/800"
                
                cur.execute(
                    """INSERT INTO prospect_properties (title, description, location, category_id, estimated_worth, year_of_construction, image_url)
                       VALUES (%s, %s, %s, %s, %s, %s, %s);""",
                    (title, description, location, category['id'], estimated_worth, year_of_construction, image_url)
                )
                prospect_properties_count += 1
        print(f"Seeded {prospect_properties_count} prospect properties.")

        conn.commit()
        print("Data seeding complete!")

    except Exception as e:
        print(f"Error seeding data: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            cur.close()
            conn.close()

if __name__ == "__main__":
    seed_data()
