
from django.urls import path
from .views import (
    UnregisteredGuardianView,
    UnregisteredGuardianByTeacherView,
    UnregisteredGuardianPublicListView,
)

app_name = 'guardian'

urlpatterns = [
    path('', UnregisteredGuardianView.as_view(), name='guardian-list-create'),
    path('<int:pk>/', UnregisteredGuardianView.as_view(), name='guardian-detail'),
    path('teacher/<int:teacher_id>/', UnregisteredGuardianByTeacherView.as_view(), name='guardian-by-teacher'),

    path('public/', UnregisteredGuardianPublicListView.as_view(), name='guardian-public-list'),

]
