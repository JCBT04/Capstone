from django.contrib import admin
from django.utils.html import format_html
from .models import UnregisteredGuardian

@admin.register(UnregisteredGuardian)
class UnregisteredGuardianAdmin(admin.ModelAdmin):
    list_display = [
        'name', 
        'student_name', 
        'age',
        'relationship', 
        'contact', 
        'status',
        'teacher_display',
        'photo_thumbnail',
        'timestamp',
        'status',
    ]
    list_filter = ['relationship', 'status', 'timestamp', 'teacher']
    search_fields = ['name', 'student_name', 'contact', 'address']
    readonly_fields = ['timestamp', 'photo_preview']
    date_hierarchy = 'timestamp'
    
    fieldsets = (
        ('Unregistered Guardian Information', {
            'fields': ('teacher', 'name', 'age', 'relationship')
        }),
        ('Student Information', {
            'fields': ('student_name',)
        }),
        ('Contact Details', {
            'fields': ('contact', 'address')
        }),
        ('Photo', {
            'fields': ('photo', 'photo_preview'),
            'description': 'Upload unregistered guardian photo (optional)'
        }),
        ('Metadata', {
            'fields': ('timestamp',),
            'classes': ('collapse',)
        }),
    )
    
    def teacher_display(self, obj):
        """Display teacher's full name"""
        return obj.teacher.user.get_full_name() or obj.teacher.user.username
    teacher_display.short_description = 'Teacher'
    
    def photo_thumbnail(self, obj):
        """Display small thumbnail in list view"""
        if obj.photo:
            return format_html(
                '<img src="{}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 50%;" />',
                obj.photo.url
            )
        return format_html('<span style="color: #999;">No photo</span>')
    photo_thumbnail.short_description = 'Photo'
    
    def photo_preview(self, obj):
        """Display larger preview in detail view"""
        if obj.photo:
            return format_html(
                '<img src="{}" style="max-width: 300px; max-height: 300px; object-fit: contain; border: 1px solid #ddd; border-radius: 8px;" />',
                obj.photo.url
            )
        return format_html('<span style="color: #999;">No photo uploaded</span>')
    photo_preview.short_description = 'Photo Preview'
    
    def get_queryset(self, request):
        """Optimize queries by selecting related teacher and user"""
        qs = super().get_queryset(request)
        return qs.select_related('teacher', 'teacher__user')

    actions = ['mark_allowed', 'mark_declined']

    def mark_allowed(self, request, queryset):
        updated = queryset.update(status='allowed')
        self.message_user(request, f"Marked {updated} as allowed.")
    mark_allowed.short_description = "Mark selected as Allowed"

    def mark_declined(self, request, queryset):
        updated = queryset.update(status='declined')
        self.message_user(request, f"Marked {updated} as declined.")
    mark_declined.short_description = "Mark selected as Declined"