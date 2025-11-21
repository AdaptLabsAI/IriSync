'use client';

import { 
  Box, 
  Stack, 
  Typography, 
  Chip, 
  Divider,
  Button
} from '@mui/material';
import { useRouter } from 'next/navigation';

type Post = {
  id: string;
  title: string;
  platform: string;
  scheduledFor: string;
  status: 'ready' | 'draft';
};

type UpcomingPostsProps = {
  posts: Post[];
};

export default function UpcomingPosts({ posts }: UpcomingPostsProps) {
  const router = useRouter();
  
  return (
    <Stack spacing={2}>
      {posts.map((post, index) => (
        <Box key={post.id}>
          {index > 0 && <Divider sx={{ my: 2 }} />}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="subtitle1">{post.title}</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" color="text.secondary">{post.platform}</Typography>
                <Typography variant="body2" color="text.secondary">&bull;</Typography>
                <Typography variant="body2" color="text.secondary">{post.scheduledFor}</Typography>
              </Stack>
            </Box>
            <Box>
              <Chip 
                label={post.status === 'ready' ? 'Ready' : 'Draft'} 
                color={post.status === 'ready' ? 'success' : 'default'}
                size="small"
              />
            </Box>
          </Box>
        </Box>
      ))}
      
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
        <Button 
          variant="outlined" 
          fullWidth
          onClick={() => router.push('/dashboard/content/calendar')}
        >
          View Calendar
        </Button>
      </Box>
    </Stack>
  );
} 