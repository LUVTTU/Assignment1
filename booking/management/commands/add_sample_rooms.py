from django.core.management.base import BaseCommand
from booking.models import Room
from faker import Faker
import random

class Command(BaseCommand):
    help = 'Adds sample conference rooms to the database'

    def handle(self, *args, **kwargs):
        fake = Faker()
        
        # List of room names and their properties
        rooms_data = [
            # Large conference rooms
            {
                'name': 'Grand Ballroom',
                'room_type': 'CONFERENCE',
                'building': 'MAIN',
                'floor': 1,
                'room_number': 'GB-101',
                'capacity': 200,
                'has_projector': True,
                'has_whiteboard': False,
                'has_video_conference': True,
                'has_teleconference': True,
                'has_wifi': True,
                'has_tv': True,
                'has_podium': True,
                'description': 'Our largest conference space, perfect for company-wide meetings and large events.'
            },
            {
                'name': 'Executive Boardroom',
                'room_type': 'CONFERENCE',
                'building': 'MAIN',
                'floor': 10,
                'room_number': 'EB-1001',
                'capacity': 20,
                'has_projector': True,
                'has_whiteboard': True,
                'has_video_conference': True,
                'has_teleconference': True,
                'has_wifi': True,
                'has_tv': True,
                'has_podium': False,
                'description': 'Elegant boardroom with premium furnishings and advanced AV capabilities.'
            },
            # Meeting rooms
            {
                'name': 'Innovation Hub',
                'room_type': 'MEETING',
                'building': 'NORTH',
                'floor': 3,
                'room_number': 'N-301',
                'capacity': 12,
                'has_projector': True,
                'has_whiteboard': True,
                'has_video_conference': True,
                'has_teleconference': False,
                'has_wifi': True,
                'has_tv': False,
                'has_podium': False,
                'description': 'Collaborative space with writable walls and flexible seating.'
            },
            {
                'name': 'Focus Room',
                'room_type': 'MEETING',
                'building': 'SOUTH',
                'floor': 2,
                'room_number': 'S-205',
                'capacity': 6,
                'has_projector': False,
                'has_whiteboard': True,
                'has_video_conference': False,
                'has_teleconference': False,
                'has_wifi': True,
                'has_tv': False,
                'has_podium': False,
                'description': 'Small, quiet space for focused work or small team meetings.'
            },
            # Training rooms
            {
                'name': 'Learning Center',
                'room_type': 'TRAINING',
                'building': 'EAST',
                'floor': 1,
                'room_number': 'E-101',
                'capacity': 30,
                'has_projector': True,
                'has_whiteboard': True,
                'has_video_conference': True,
                'has_teleconference': True,
                'has_wifi': True,
                'has_tv': True,
                'has_podium': True,
                'description': 'Classroom-style setup ideal for training sessions and workshops.'
            },
            {
                'name': 'Tech Lab',
                'room_type': 'TRAINING',
                'building': 'WEST',
                'floor': 2,
                'room_number': 'W-201',
                'capacity': 15,
                'has_projector': True,
                'has_whiteboard': True,
                'has_video_conference': False,
                'has_teleconference': False,
                'has_wifi': True,
                'has_tv': False,
                'has_podium': False,
                'description': 'Hands-on training space with workstations and equipment.'
            },
            # Auditorium
            {
                'name': 'Main Auditorium',
                'room_type': 'AUDITORIUM',
                'building': 'MAIN',
                'floor': 1,
                'room_number': 'AUD-1',
                'capacity': 300,
                'has_projector': True,
                'has_whiteboard': False,
                'has_video_conference': True,
                'has_teleconference': True,
                'has_wifi': True,
                'has_tv': True,
                'has_podium': True,
                'description': 'State-of-the-art auditorium with professional AV setup and tiered seating.'
            },
            # More varied rooms
            {
                'name': 'Creative Studio',
                'room_type': 'MEETING',
                'building': 'NORTH',
                'floor': 4,
                'room_number': 'N-401',
                'capacity': 8,
                'has_projector': False,
                'has_whiteboard': True,
                'has_video_conference': True,
                'has_teleconference': False,
                'has_wifi': True,
                'has_tv': True,
                'has_podium': False,
                'description': 'Inspiring space for creative brainstorming and design thinking sessions.'
            },
            {
                'name': 'Sunrise Room',
                'room_type': 'CONFERENCE',
                'building': 'EAST',
                'floor': 3,
                'room_number': 'E-301',
                'capacity': 15,
                'has_projector': True,
                'has_whiteboard': True,
                'has_video_conference': True,
                'has_teleconference': False,
                'has_wifi': True,
                'has_tv': False,
                'has_podium': False,
                'description': 'Bright, airy meeting room with natural light and city views.'
            },
            {
                'name': 'War Room',
                'room_type': 'MEETING',
                'building': 'WEST',
                'floor': 1,
                'room_number': 'W-101',
                'capacity': 10,
                'has_projector': True,
                'has_whiteboard': True,
                'has_video_conference': False,
                'has_teleconference': True,
                'has_wifi': True,
                'has_tv': False,
                'has_podium': False,
                'description': 'Dedicated space for project teams with ample whiteboard space and display screens.'
            },
            {
                'name': 'Sky Lounge',
                'room_type': 'CONFERENCE',
                'building': 'MAIN',
                'floor': 15,
                'room_number': 'M-1501',
                'capacity': 25,
                'has_projector': True,
                'has_whiteboard': True,
                'has_video_conference': True,
                'has_teleconference': True,
                'has_wifi': True,
                'has_tv': True,
                'has_podium': True,
                'description': 'Premium executive meeting space with panoramic city views, perfect for high-level discussions and client meetings.'
            },
            {
                'name': 'Huddle Space',
                'room_type': 'MEETING',
                'building': 'NORTH',
                'floor': 2,
                'room_number': 'N-202',
                'capacity': 4,
                'has_projector': False,
                'has_whiteboard': True,
                'has_video_conference': False,
                'has_teleconference': False,
                'has_wifi': True,
                'has_tv': True,
                'has_podium': False,
                'description': 'Cozy space for quick team huddles and impromptu discussions with a 55\' display for screen sharing.'
            },
        ]

        # Create the rooms
        for room_data in rooms_data:
            # Check if room with this name already exists
            if not Room.objects.filter(name=room_data['name']).exists():
                room_data['is_active'] = True  # Ensure rooms are active
                room = Room(**room_data)
                room.save()
                self.stdout.write(self.style.SUCCESS(f'Successfully created room: {room.name}'))
            else:
                self.stdout.write(self.style.WARNING(f'Room already exists: {room_data["name"]}'))
        
        self.stdout.write(self.style.SUCCESS('Successfully created all sample rooms!'))
