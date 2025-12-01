"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from parents.views import ParentNotificationListCreateView, ParentEventListCreateView, ParentScheduleListCreateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('teacher.urls')),
    path('api/guardian/', include('guardian.urls')),
    path('api/parents/', include('parents.urls')),  # ✅ ADD THIS
    path('api/notifications/', ParentNotificationListCreateView.as_view(), name='notifications'),
    path('api/events/', ParentEventListCreateView.as_view(), name='events'),
    path('api/schedule/', ParentScheduleListCreateView.as_view(), name='schedule'),
]

# Serve media files in all environments (needed for Render ephemeral filesystem workaround)
# Note: For production, consider using S3/cloud storage instead
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)