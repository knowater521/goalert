import React, { useState } from 'react'
import p from 'prop-types'
import gql from 'graphql-tag'
import FlatList from '../lists/FlatList'
import {
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogTitle,
  CardHeader,
  Grid,
  IconButton,
} from '@material-ui/core'
import { useQuery } from 'react-apollo'
import { isWidthUp } from '@material-ui/core/withWidth'
import { sortContactMethods } from './util'
import OtherActions from '../util/OtherActions'
import UserContactMethodDeleteDialog from './UserContactMethodDeleteDialog'
import UserContactMethodEditDialog from './UserContactMethodEditDialog'
import { Warning } from '../icons'
import UserContactMethodVerificationDialog from './UserContactMethodVerificationDialog'
import { makeStyles, createStyles } from '@material-ui/core/styles'
import { useMutation } from '@apollo/react-hooks'
import { styles as globalStyles } from '../styles/materialStyles'
import useWidth from '../util/useWidth'
import Spinner from '../loading/components/Spinner'
import { GenericError } from '../error-pages'
import DialogContentError from '../dialogs/components/DialogContentError'

const query = gql`
  query cmList($id: ID!) {
    user(id: $id) {
      id
      contactMethods {
        id
        name
        type
        value
        formattedValue
        disabled
      }
    }
  }
`

const testCM = gql`
  mutation($id: ID!) {
    testContactMethod(id: $id)
  }
`

const useStyles = makeStyles((theme) => {
  const { cardHeader } = globalStyles(theme)

  return createStyles({
    actionGrid: {
      display: 'flex',
      alignItems: 'center',
    },
    cardHeader,
  })
})

export default function UserContactMethodList(props) {
  const classes = useStyles()
  const width = useWidth()

  const [showVerifyDialogByID, setShowVerifyDialogByID] = useState(null)
  const [showEditDialogByID, setShowEditDialogByID] = useState(null)
  const [showDeleteDialogByID, setShowDeleteDialogByID] = useState(null)

  const [showSendTestErrorDialog, setShowSendTestErrorDialog] = useState(false)
  const [sendTest, sendTestStatus] = useMutation(testCM, {
    onError: () => setShowSendTestErrorDialog(true),
  })

  const { loading, error, data } = useQuery(query, {
    variables: {
      id: props.userID,
    },
  })

  if (loading && !data) return <Spinner />
  if (error) return <GenericError error={error.message} />

  const contactMethods = data.user.contactMethods

  const getIcon = (cm) => {
    if (!cm.disabled) return null
    if (props.readOnly) {
      return <Warning message='Contact method disabled' />
    }

    return (
      <IconButton
        data-cy='cm-disabled'
        aria-label='Reactivate contact method'
        onClick={() => setShowVerifyDialogByID(cm.id)}
        variant='contained'
        color='primary'
        disabled={props.readOnly}
      >
        <Warning message='Contact method disabled' />
      </IconButton>
    )
  }

  function getActionMenuItems(cm) {
    const actions = [
      { label: 'Edit', onClick: () => setShowEditDialogByID(cm.id) },
      {
        label: 'Delete',
        onClick: () => setShowDeleteDialogByID(cm.id),
      },
    ]

    if (!cm.disabled) {
      actions.push({
        label: 'Send Test',
        onClick: () =>
          sendTest({
            variables: {
              id: cm.id,
            },
          }),
      })
    } else {
      actions.push({
        label: 'Reactivate',
        onClick: () => setShowVerifyDialogByID(cm.id),
      })
    }

    return actions
  }

  function getSecondaryAction(cm) {
    return (
      <Grid container spacing={2} className={classes.actionGrid}>
        {cm.disabled && !props.readOnly && isWidthUp('md', width) && (
          <Grid item>
            <Button
              aria-label='Reactivate contact method'
              onClick={() => setShowVerifyDialogByID(cm.id)}
              variant='contained'
              color='primary'
            >
              Reactivate
            </Button>
          </Grid>
        )}
        {!props.readOnly && (
          <Grid item>
            <OtherActions actions={getActionMenuItems(cm)} />
          </Grid>
        )}
      </Grid>
    )
  }

  return (
    <Grid item xs={12}>
      <Card>
        <CardHeader
          className={classes.cardHeader}
          component='h3'
          title='Contact Methods'
        />
        <FlatList
          data-cy='contact-methods'
          items={sortContactMethods(contactMethods).map((cm) => ({
            title: `${cm.name} (${cm.type})${cm.disabled ? ' - Disabled' : ''}`,
            subText: cm.formattedValue,
            secondaryAction: getSecondaryAction(cm),
            icon: getIcon(cm),
          }))}
          emptyMessage='No contact methods'
        />
        {showVerifyDialogByID && (
          <UserContactMethodVerificationDialog
            contactMethodID={showVerifyDialogByID}
            onClose={() => setShowVerifyDialogByID(null)}
          />
        )}
        {showEditDialogByID && (
          <UserContactMethodEditDialog
            contactMethodID={showEditDialogByID}
            onClose={() => setShowEditDialogByID(null)}
          />
        )}
        {showDeleteDialogByID && (
          <UserContactMethodDeleteDialog
            contactMethodID={showDeleteDialogByID}
            onClose={() => setShowDeleteDialogByID(null)}
          />
        )}
        <Dialog
          open={showSendTestErrorDialog}
          onClose={() => setShowSendTestErrorDialog(false)}
        >
          <DialogTitle>An error occurred</DialogTitle>
          <DialogContentError error={sendTestStatus?.error?.message ?? ''} />
          <DialogActions>
            <Button
              color='primary'
              variant='contained'
              onClick={() => setShowSendTestErrorDialog(false)}
            >
              Okay
            </Button>
          </DialogActions>
        </Dialog>
      </Card>
    </Grid>
  )
}

UserContactMethodList.propTypes = {
  userID: p.string.isRequired,
  readOnly: p.bool,
}
