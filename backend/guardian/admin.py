from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from .models import Guardian

@admin.register(Guardian)
class GuardianAdmin(admin.ModelAdmin):
    list_display = [
        'name', 
        'student_name', 
        'age',
        'relationship', 
        'contact', 
        'teacher_display',
        'status_badge',
        'photo_thumbnail',
        'timestamp'
    ]
    list_filter = ['status', 'relationship', 'timestamp', 'teacher']
    search_fields = ['name', 'student_name', 'contact', 'address']
    readonly_fields = ['timestamp', 'photo_preview']
    date_hierarchy = 'timestamp'
    
    fieldsets = (
        ('Guardian Information', {
            'fields': ('teacher', 'name', 'age', 'relationship')
        }),
        ('Student Information', {
            'fields': ('student_name',)
        }),
        ('Contact Details', {
            'fields': ('contact', 'address')
        }),
        ('Status', {
            'fields': ('status',),
            'description': 'Approval status of the guardian'
        }),
        ('Photo', {
            'fields': ('photo', 'photo_preview'),
            'description': 'Upload guardian photo (optional)'
        }),
        ('Metadata', {
            'fields': ('timestamp',),
            'classes': ('collapse',)
        }),
    )
    
    class Media:
        js = ('admin/js/guardian_photo_preview.js',)
        css = {
            'all': ('admin/css/guardian_admin.css',)
        }
    
    def teacher_display(self, obj):
        """Display teacher's full name"""
        return obj.teacher.user.get_full_name() or obj.teacher.user.username
    teacher_display.short_description = 'Teacher'
    
    def status_badge(self, obj):
        """Display status with color badge"""
        colors = {
            'pending': '#ffa500',
            'allowed': '#28a745',
            'declined': '#dc3545'
        }
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 12px; font-weight: bold;">{}</span>',
            colors.get(obj.status, '#6c757d'),
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
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
        """Display larger preview in detail view with live preview for new uploads"""
        preview_html = '''
        <div id="photo-preview-container">
            {existing_photo}
            <div id="photo-preview-new" style="display: none; margin-top: 10px;">
                <p style="color: #666; font-weight: bold;">New photo preview:</p>
                <img id="photo-preview-img" src="" style="max-width: 300px; max-height: 300px; object-fit: contain; border: 1px solid #ddd; border-radius: 8px;" />
            </div>
        </div>
        <script>
            (function() {{
                // Wait for DOM to be ready
                if (document.readyState === 'loading') {{
                    document.addEventListener('DOMContentLoaded', initPhotoPreview);
                }} else {{
                    initPhotoPreview();
                }}
                
                function initPhotoPreview() {{
                    const photoInput = document.querySelector('input[name="photo"]');
                    if (!photoInput) return;
                    
                    photoInput.addEventListener('change', function(e) {{
                        const file = e.target.files[0];
                        const previewContainer = document.getElementById('photo-preview-new');
                        const previewImg = document.getElementById('photo-preview-img');
                        
                        if (file && file.type.startsWith('image/')) {{
                            const reader = new FileReader();
                            reader.onload = function(e) {{
                                previewImg.src = e.target.result;
                                previewContainer.style.display = 'block';
                            }};
                            reader.readAsDataURL(file);
                        }} else {{
                            previewContainer.style.display = 'none';
                        }}
                    }});
                    
                    // Handle clear checkbox
                    const clearCheckbox = document.querySelector('input[name="photo-clear"]');
                    if (clearCheckbox) {{
                        clearCheckbox.addEventListener('change', function(e) {{
                            const previewContainer = document.getElementById('photo-preview-new');
                            if (e.target.checked) {{
                                previewContainer.style.display = 'none';
                            }}
                        }});
                    }}
                }}
            }})();
        </script>
        '''
        
        if obj.photo:
            existing_photo = format_html(
                '''<div>
                    <p style="color: #666; font-weight: bold;">Current photo:</p>
                    <img src="{}" style="max-width: 300px; max-height: 300px; object-fit: contain; border: 1px solid #ddd; border-radius: 8px;" />
                </div>''',
                obj.photo.url
            )
        else:
            existing_photo = '<p style="color: #999;">No photo uploaded yet</p>'
        
        return mark_safe(preview_html.format(existing_photo=existing_photo))
    
    photo_preview.short_description = 'Photo Preview'
    
    def get_queryset(self, request):
        """Optimize queries by selecting related teacher and user"""
        qs = super().get_queryset(request)
        return qs.select_related('teacher', 'teacher__user')
    
    actions = ['mark_as_allowed', 'mark_as_declined', 'mark_as_pending']
    
    def mark_as_allowed(self, request, queryset):
        updated = queryset.update(status='allowed')
        self.message_user(request, f'{updated} guardian(s) marked as allowed.')
    mark_as_allowed.short_description = 'Mark selected as Allowed'
    
    def mark_as_declined(self, request, queryset):
        updated = queryset.update(status='declined')
        self.message_user(request, f'{updated} guardian(s) marked as declined.')
    mark_as_declined.short_description = 'Mark selected as Declined'
    
    def mark_as_pending(self, request, queryset):
        updated = queryset.update(status='pending')
        self.message_user(request, f'{updated} guardian(s) marked as pending.')
    mark_as_pending.short_description = 'Mark selected as Pending'